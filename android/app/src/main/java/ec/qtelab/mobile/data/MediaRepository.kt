package ec.qtelab.mobile.data

import android.content.Context
import android.net.Uri
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

class MediaRepository(private val context: Context) {
    private val directory = File(context.filesDir, "media").apply { mkdirs() }
    private val indexFile = File(directory, "media_index.json")
    private var index: MutableMap<String, MediaMeta> = loadIndex().toMutableMap()
    private val bundledMusic = BundledMusicStore(context)

    fun allMeta(): List<MediaMeta> =
        BundledMusicCatalog.ids.mapNotNull(bundledMusic::meta) + index.values.toList()

    fun fileFor(id: String?): File? =
        bundledMusic.fileFor(id) ?: id?.let { File(directory, safeName(it)) }?.takeIf(File::exists)

    fun meta(id: String?): MediaMeta? =
        bundledMusic.meta(id) ?: id?.let(index::get)

    fun importUri(uri: Uri, preferredName: String? = null): String {
        val resolver = context.contentResolver
        val type = resolver.getType(uri) ?: "application/octet-stream"
        val id = "media-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().take(8)
        val target = File(directory, safeName(id))
        resolver.openInputStream(uri)?.use { input -> target.outputStream().use { output -> input.copyTo(output) } }
            ?: error("No se pudo abrir el archivo seleccionado.")
        index[id] = MediaMeta(id, preferredName ?: uri.lastPathSegment ?: "archivo", type)
        saveIndex()
        return id
    }

    fun putBytes(id: String, bytes: ByteArray, name: String, type: String, createdAt: Long = System.currentTimeMillis()) {
        File(directory, safeName(id)).writeBytes(bytes)
        index[id] = MediaMeta(id, name, type, createdAt)
        saveIndex()
    }

    fun delete(id: String?) {
        if (id == null || BundledMusicCatalog.isBundled(id)) return
        fileFor(id)?.delete()
        if (index.remove(id) != null) saveIndex()
    }

    fun replaceAll(records: List<ImportedMedia>) {
        val tempDir = File(context.cacheDir, "qte_media_import_" + System.nanoTime()).apply { mkdirs() }
        try {
            records.forEach { File(tempDir, safeName(it.meta.id)).writeBytes(it.bytes) }
            directory.listFiles()?.filter { it.name != indexFile.name }?.forEach(File::delete)
            records.forEach { record ->
                File(tempDir, safeName(record.meta.id)).copyTo(File(directory, safeName(record.meta.id)), overwrite = true)
            }
            index = records.associate { it.meta.id to it.meta }.toMutableMap()
            saveIndex()
        } finally {
            tempDir.deleteRecursively()
        }
    }

    fun snapshot(): List<ImportedMedia> = index.values.mapNotNull { meta ->
        val file = fileFor(meta.id) ?: return@mapNotNull null
        ImportedMedia(meta, file.readBytes())
    }

    fun exportMedia(): JSONArray = JSONArray().apply {
        index.values.forEach { meta ->
            val file = fileFor(meta.id) ?: return@forEach
            val b64 = Base64.encodeToString(file.readBytes(), Base64.NO_WRAP)
            put(JSONObject().apply {
                put("id", meta.id); put("name", meta.name); put("type", meta.type); put("createdAt", meta.createdAt)
                put("dataUrl", "data:" + meta.type + ";base64," + b64)
            })
        }
    }

    fun parseImportedMedia(array: JSONArray?): List<ImportedMedia> {
        if (array == null) return emptyList()
        return buildList {
            for (i in 0 until array.length()) {
                val obj = array.optJSONObject(i) ?: continue
                val id = obj.optString("id")
                val dataUrl = obj.optString("dataUrl")
                if (id.isBlank() || dataUrl.isBlank()) continue
                val comma = dataUrl.indexOf(',')
                if (comma < 0) continue
                val header = dataUrl.substring(0, comma)
                val bytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT)
                val type = obj.optString("type").ifBlank {
                    header.substringAfter("data:").substringBefore(';').ifBlank { "application/octet-stream" }
                }
                add(ImportedMedia(MediaMeta(id, obj.optString("name", "archivo"), type, obj.optLong("createdAt", System.currentTimeMillis())), bytes))
            }
        }
    }

    private fun loadIndex(): Map<String, MediaMeta> = runCatching {
        if (!indexFile.exists()) return@runCatching emptyMap()
        val arr = JSONArray(indexFile.readText())
        buildMap {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val m = MediaMeta(o.getString("id"), o.optString("name", "archivo"), o.optString("type", "application/octet-stream"), o.optLong("createdAt", 0L))
                put(m.id, m)
            }
        }
    }.getOrDefault(emptyMap())

    private fun saveIndex() {
        val arr = JSONArray().apply { index.values.forEach { put(JSONObject().apply {
            put("id", it.id); put("name", it.name); put("type", it.type); put("createdAt", it.createdAt)
        }) } }
        atomicWrite(indexFile, arr.toString())
    }

    private fun safeName(value: String) = value.replace(Regex("[^A-Za-z0-9._-]"), "_")
    private fun atomicWrite(file: File, text: String) {
        val temp = File(file.parentFile, file.name + ".tmp")
        temp.writeText(text)
        if (file.exists()) file.delete()
        check(temp.renameTo(file)) { "No se pudo guardar " + file.name }
    }
}

data class ImportedMedia(val meta: MediaMeta, val bytes: ByteArray)
