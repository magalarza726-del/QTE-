package ec.qtelab.mobile.data

import android.content.Context
import android.net.Uri
import ec.qtelab.mobile.domain.EmblemDistributor
import ec.qtelab.mobile.domain.DeckRules
import ec.qtelab.mobile.domain.QteFormulas
import org.json.JSONObject
import java.io.File

class QteRepository(private val context: Context) {
    private val stateFile = File(context.filesDir, "qte_state.json")
    val media = MediaRepository(context)

    fun load(): PersistentState {
        if (stateFile.exists()) {
            runCatching { return sanitize(JsonCodec.decodeState(JSONObject(stateFile.readText()))) }
        }
        return loadInitial().also(::save)
    }

    fun save(state: PersistentState) {
        val sanitized = sanitize(state)
        atomicWrite(stateFile, JsonCodec.encodeState(sanitized).toString())
    }

    fun importCardImage(uri: Uri): String = media.importUri(uri)

    fun exportBackup(state: PersistentState): String = JSONObject().apply {
        put("app", "QTE Lab")
        put("version", "android-0.3.0")
        put("exportedAt", java.time.Instant.now().toString())
        put("state", JsonCodec.encodeState(sanitize(state)))
        put("media", media.exportMedia())
    }.toString(2)

    fun importBackup(text: String): PersistentState {
        val payload = JSONObject(text)
        val stateObj = payload.optJSONObject("state") ?: payload
        val importedState = sanitize(JsonCodec.decodeState(stateObj))
        val importedMedia = media.parseImportedMedia(payload.optJSONArray("media"))
        val previousState = load()
        val previousMedia = media.snapshot()
        return try {
            if (payload.has("media")) media.replaceAll(importedMedia)
            save(importedState)
            importedState
        } catch (error: Throwable) {
            runCatching { media.replaceAll(previousMedia) }
            runCatching { save(previousState) }
            throw error
        }
    }

    fun reset(): PersistentState {
        stateFile.delete()
        media.replaceAll(emptyList())
        return loadInitial().also(::save)
    }

    private fun loadInitial(): PersistentState {
        val text = context.assets.open("initial_data.json").bufferedReader().use { it.readText() }
        val root = JSONObject(text)
        val cardsObj = JSONObject().apply { put("cards", root.getJSONArray("cards")) }
        val base = JsonCodec.decodeState(cardsObj)
        val idByName = base.cards.associate { it.name to it.id }
        val starter = root.optJSONObject("starterDecks") ?: JSONObject()
        val decks = buildMap {
            starter.keys().forEach { name ->
                val arr = starter.optJSONArray(name)
                val ids = buildList {
                    if (arr != null) for (i in 0 until arr.length()) idByName[arr.optString(i)]?.let(::add)
                }
                put(name, ids)
            }
        }
        fun starterDeck(name: String): List<String> {
            val selected = decks[name].orEmpty().take(DeckRules.MAX_CARDS).toMutableList()
            if (selected.size < DeckRules.MIN_CARDS) {
                base.cards.asSequence()
                    .map { it.id }
                    .filterNot(selected::contains)
                    .take(DeckRules.MIN_CARDS - selected.size)
                    .forEach(selected::add)
            }
            return selected
        }
        val player = starterDeck("Inicial Fácil")
        val enemy = starterDeck("Inicial Medio")
        val settings = AppSettings()
        return PersistentState(
            cards = base.cards,
            decks = decks,
            playerDeck = player,
            enemyDeck = enemy,
            settings = settings,
            enchantments = EnchantmentManifest(
                player = EmblemDistributor.distribute(settings.playerEmblems, player.size),
                enemy = EmblemDistributor.distribute(settings.enemyEmblems, enemy.size)
            )
        )
    }

    private fun sanitize(state: PersistentState): PersistentState {
        val cards = state.cards.map(QteFormulas::refresh)
        val ids = cards.mapTo(hashSetOf()) { it.id }
        fun deck(list: List<String>) = list.filter(ids::contains).distinct().take(DeckRules.MAX_CARDS)
        val decks = state.decks.mapValues { deck(it.value) }
        return state.copy(
            cards = cards,
            decks = decks,
            playerDeck = deck(state.playerDeck),
            enemyDeck = deck(state.enemyDeck),
            settings = state.settings.copy(
                playerEmblems = state.settings.playerEmblems.distinct().take(4),
                enemyEmblems = state.settings.enemyEmblems.distinct().take(4)
            )
        )
    }

    private fun atomicWrite(file: File, text: String) {
        val temp = File(file.parentFile, file.name + ".tmp")
        temp.writeText(text)
        if (file.exists() && !file.delete()) error("No se pudo sustituir el estado anterior.")
        if (!temp.renameTo(file)) error("No se pudo confirmar el nuevo estado.")
    }
}
