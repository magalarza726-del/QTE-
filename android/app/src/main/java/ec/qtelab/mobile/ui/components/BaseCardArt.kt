package ec.qtelab.mobile.ui.components

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BitmapRegionDecoder
import android.graphics.Rect
import android.util.Base64
import android.util.LruCache
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.Locale

object BaseCardArtStore {
    private const val CELL_WIDTH = 280
    private const val CELL_HEIGHT = 104
    private val bitmapCache = object : LruCache<Int, Bitmap>(36) {}
    private val atlasBytes = mutableMapOf<Int, ByteArray>()
    private val lock = Any()

    fun baseNumber(cardId: String): Int? {
        val value = cardId.substringAfterLast('-', "").toIntOrNull() ?: return null
        return value.takeIf { it in 1..100 }
    }

    fun load(context: Context, cardId: String): Bitmap? {
        val number = baseNumber(cardId) ?: return null
        synchronized(lock) { bitmapCache.get(number)?.let { return it } }
        return runCatching {
            val group = (number - 1) / 10
            val bytes = synchronized(lock) {
                atlasBytes[group] ?: loadAtlasBytes(context, group).also { atlasBytes[group] = it }
            }
            val slot = (number - 1) % 10
            val column = slot % 2
            val row = slot / 2
            val rect = Rect(
                column * CELL_WIDTH,
                row * CELL_HEIGHT,
                (column + 1) * CELL_WIDTH,
                (row + 1) * CELL_HEIGHT
            )
            @Suppress("DEPRECATION")
            val decoder = BitmapRegionDecoder.newInstance(bytes, 0, bytes.size, false)
            try {
                decoder.decodeRegion(
                    rect,
                    BitmapFactory.Options().apply { inPreferredConfig = Bitmap.Config.ARGB_8888 }
                )
            } finally {
                decoder.recycle()
            }
        }.getOrNull()?.also { bitmap ->
            synchronized(lock) { bitmapCache.put(number, bitmap) }
        }
    }

    private fun loadAtlasBytes(context: Context, group: Int): ByteArray {
        val start = group * 10 + 1
        val end = start + 9
        val name = String.format(Locale.US, "base_card_art/cards_%02d_%02d.webp.b64", start, end)
        val encoded = context.assets.open(name).bufferedReader().use { it.readText() }
        return Base64.decode(encoded, Base64.DEFAULT)
    }
}

@Composable
fun rememberBaseCardArt(cardId: String): ImageBitmap? {
    val context = LocalContext.current
    val bitmap by produceState<Bitmap?>(initialValue = null, cardId) {
        value = withContext(Dispatchers.IO) {
            BaseCardArtStore.load(context.applicationContext, cardId)
        }
    }
    return bitmap?.asImageBitmap()
}
