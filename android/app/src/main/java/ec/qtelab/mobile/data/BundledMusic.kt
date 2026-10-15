package ec.qtelab.mobile.data

import android.content.Context
import android.util.Base64
import java.io.File

data class BundledMusicTrack(
    val id: String,
    val name: String,
    val stem: String,
    val parts: Int,
    val expectedBytes: Long
)

object BundledMusicCatalog {
    val all = listOf(
        BundledMusicTrack("builtin:garra_de_acero_1", "Garra de Acero (1)", "garra_de_acero_1", 6, 1320143L),
        BundledMusicTrack("builtin:garra_de_acero", "Garra de Acero", "garra_de_acero", 5, 1309372L),
        BundledMusicTrack("builtin:laboratorio_x", "Laboratorio X", "laboratorio_x", 5, 1180573L),
        BundledMusicTrack("builtin:marcha_de_cero", "Marcha de Cero", "marcha_de_cero", 9, 2212915L),
        BundledMusicTrack("builtin:ceniza_y_rayo", "Ceniza y Rayo", "ceniza_y_rayo", 8, 1883923L),
        BundledMusicTrack("builtin:pulso_de_acero", "Pulso de Acero", "pulso_de_acero", 7, 1786705L)
    )

    val ids: List<String> = all.map { it.id }

    fun get(id: String?): BundledMusicTrack? = all.firstOrNull { it.id == id }
    fun isBundled(id: String?): Boolean = get(id) != null
}

class BundledMusicStore(private val context: Context) {
    private val directory = File(context.filesDir, "bundled_music").apply { mkdirs() }

    fun fileFor(id: String?): File? {
        val track = BundledMusicCatalog.get(id) ?: return null
        val target = File(directory, track.stem + ".ogg")
        if (target.exists() && target.length() == track.expectedBytes) return target

        val temp = File(directory, track.stem + ".tmp")
        runCatching {
            temp.outputStream().buffered().use { output ->
                repeat(track.parts) { index ->
                    val assetName = "builtin_music/chunks/" +
                        track.stem + "__" + index.toString().padStart(3, '0') + ".b64"
                    val encoded = context.assets.open(assetName).bufferedReader().use { it.readText() }
                    output.write(Base64.decode(encoded.trim(), Base64.DEFAULT))
                }
            }
            check(temp.length() == track.expectedBytes) {
                "La pista " + track.name + " no se reconstruyó correctamente."
            }
            if (target.exists()) target.delete()
            check(temp.renameTo(target)) { "No se pudo preparar " + track.name }
            target
        }.onFailure {
            temp.delete()
        }.getOrNull()?.let { return it }

        return null
    }

    fun meta(id: String?): MediaMeta? {
        val track = BundledMusicCatalog.get(id) ?: return null
        return MediaMeta(
            id = track.id,
            name = track.name,
            type = "audio/ogg",
            createdAt = 0L
        )
    }
}
