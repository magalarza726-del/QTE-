package com.maverick.qte

import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.webkit.WebViewAssetLoader
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/** Contenedor offline para QTE Lab: conserva íntegramente el juego web existente. */
class MainActivity : Activity() {
    private lateinit var browser: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var exportFile: File? = null
    private var exportName = "QTE_Lab_respaldo.json"
    private val transferStreams = ConcurrentHashMap<String, FileOutputStream>()
    private val transferFiles = ConcurrentHashMap<String, File>()

    companion object {
        private const val PICK_FILE = 101
        private const val SAVE_FILE = 102
        private const val LOCAL_URL = "https://appassets.androidplatform.net/assets/www/index.html"
    }

    @SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(7, 17, 31)
        window.navigationBarColor = Color.rgb(7, 17, 31)
        val localAssets = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        browser = WebView(this).apply {
            setBackgroundColor(Color.rgb(7, 17, 31))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = true
            settings.javaScriptCanOpenWindowsAutomatically = false
            settings.mediaPlaybackRequiresUserGesture = true
            settings.setSupportMultipleWindows(false)
            WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView, request: WebResourceRequest
                ): WebResourceResponse? {
                    val uri = request.url
                    if (uri.scheme == "https" && uri.host == "appassets.androidplatform.net") {
                        return localAssets.shouldInterceptRequest(uri)
                            ?: emptyResponse()
                    }
                    if (uri.scheme == "http" || uri.scheme == "https") return emptyResponse()
                    return null
                }
                override fun shouldOverrideUrlLoading(
                    view: WebView, request: WebResourceRequest
                ): Boolean {
                    val uri = request.url
                    return uri.scheme != "https" || uri.host != "appassets.androidplatform.net"
                }
                override fun onPageFinished(view: WebView, url: String) {
                    if (url == LOCAL_URL) {
                        val js = assets.open("android-export.js")
                            .bufferedReader(Charsets.UTF_8).use { it.readText() }
                        view.evaluateJavascript(js, null)
                    }
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    webView: WebView?, filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    fileCallback?.onReceiveValue(null)
                    fileCallback = filePathCallback
                    try {
                        val intent = fileChooserParams?.createIntent()
                            ?: Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                                addCategory(Intent.CATEGORY_OPENABLE)
                                type = "*/*"
                            }
                        startActivityForResult(intent, PICK_FILE)
                    } catch (e: ActivityNotFoundException) {
                        fileCallback?.onReceiveValue(null)
                        fileCallback = null
                        showMessage("No hay selector de archivos disponible.")
                    }
                    return true
                }
            }
            addJavascriptInterface(ExportBridge(), "QTEAndroid")
        }
        setContentView(browser)
        browser.loadUrl(LOCAL_URL)
    }

    private fun emptyResponse() = WebResourceResponse(
        "text/plain", "UTF-8", ByteArrayInputStream(byteArrayOf())
    )

    private fun showMessage(message: String) =
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()

    inner class ExportBridge {
        @JavascriptInterface
        fun beginExport(name: String): String {
            val id = UUID.randomUUID().toString()
            val f = File(cacheDir, "qte-export-$id.tmp")
            transferFiles[id] = f
            transferStreams[id] = FileOutputStream(f)
            return id
        }
        @JavascriptInterface
        fun appendExportChunk(id: String, base64: String): Boolean {
            val stream = transferStreams[id] ?: return false
            return try {
                stream.write(Base64.decode(base64, Base64.DEFAULT))
                true
            } catch (e: Exception) {
                false
            }
        }
        @JavascriptInterface
        fun finishExport(id: String, suggestedName: String) {
            val stream = transferStreams.remove(id) ?: return
            try { stream.close() } catch (e: Exception) { }
            val f = transferFiles.remove(id) ?: return
            val name = suggestedName.substringAfterLast('/').substringAfterLast('\\')
                .take(100).ifBlank { "QTE_Lab_respaldo.json" }
            runOnUiThread {
                if (exportFile != null) {
                    f.delete()
                    showMessage("Termina de guardar el respaldo anterior.")
                    return@runOnUiThread
                }
                exportFile = f
                exportName = name
                val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "application/json"
                    putExtra(Intent.EXTRA_TITLE, name)
                }
                try {
                    startActivityForResult(intent, SAVE_FILE)
                } catch (e: ActivityNotFoundException) {
                    exportFile = null
                    f.delete()
                    showMessage("No hay gestor de archivos disponible.")
                }
            }
        }
        @JavascriptInterface
        fun cancelExport(id: String) {
            try { transferStreams.remove(id)?.close() } catch (e: Exception) { }
            transferFiles.remove(id)?.delete()
        }
    }

    @Deprecated("Permite usar el selector nativo desde Android 7.")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == PICK_FILE) {
            fileCallback?.onReceiveValue(
                if (resultCode == RESULT_OK)
                    WebChromeClient.FileChooserParams.parseResult(resultCode, data)
                else null
            )
            fileCallback = null
        } else if (requestCode == SAVE_FILE) {
            val f = exportFile
            exportFile = null
            if (resultCode == RESULT_OK && data?.data != null && f != null) {
                try {
                    contentResolver.openOutputStream(data.data!!)?.use { output ->
                        f.inputStream().use { input -> input.copyTo(output) }
                    } ?: throw IllegalStateException("No fue posible escribir el destino")
                    showMessage("Respaldo exportado: $exportName")
                } catch (e: Exception) {
                    showMessage("Error al guardar: $e")
                }
            }
            f?.delete()
        }
    }

    @Deprecated("Control de retroceso para Android 7 en adelante.")
    override fun onBackPressed() {
        if (browser.canGoBack()) browser.goBack()
        else AlertDialog.Builder(this)
            .setTitle("Salir de QTE Lab")
            .setMessage("Los mazos y las cartas guardados permanecerán en este dispositivo.")
            .setNegativeButton("Cancelar", null)
            .setPositiveButton("Salir") { _, _ -> finish() }
            .show()
    }

    override fun onDestroy() {
        fileCallback?.onReceiveValue(null)
        transferStreams.values.forEach { try { it.close() } catch (e: Exception) { } }
        transferFiles.values.forEach { it.delete() }
        exportFile?.delete()
        browser.removeJavascriptInterface("QTEAndroid")
        browser.destroy()
        super.onDestroy()
    }
}
