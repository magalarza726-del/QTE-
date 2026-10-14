package ec.qtelab.mobile.data

import ec.qtelab.mobile.domain.QteFormulas
import org.json.JSONArray
import org.json.JSONObject

object JsonCodec {
    fun encodeState(state: PersistentState): JSONObject = JSONObject().apply {
        put("schemaVersion", state.schemaVersion)
        put("cards", JSONArray().apply { state.cards.forEach { put(encodeCard(it)) } })
        put("decks", JSONObject().apply {
            state.decks.forEach { (name, ids) -> put(name, JSONArray(ids)) }
        })
        put("playerDeck", JSONArray(state.playerDeck))
        put("enemyDeck", JSONArray(state.enemyDeck))
        put("settings", encodeSettings(state.settings))
        put("enchantments", JSONObject().apply {
            put("player", encodeIntMap(state.enchantments.player))
            put("enemy", encodeIntMap(state.enchantments.enemy))
        })
    }

    fun decodeState(obj: JSONObject, starterDecksByName: Boolean = false): PersistentState {
        val cardsArray = obj.optJSONArray("cards") ?: JSONArray()
        val cards = buildList {
            for (i in 0 until cardsArray.length()) add(decodeCard(cardsArray.getJSONObject(i), i))
        }
        val idByName = cards.associate { it.name to it.id }
        val cardIds = cards.mapTo(hashSetOf()) { it.id }
        fun resolveDeck(array: JSONArray?): List<String> {
            if (array == null) return emptyList()
            return buildList {
                for (i in 0 until array.length()) {
                    val value = array.optString(i)
                    val resolved = if (starterDecksByName || value !in cardIds) idByName[value] ?: value else value
                    if (resolved in cardIds) add(resolved)
                }
            }
        }
        val decksObj = obj.optJSONObject("decks") ?: JSONObject()
        val decks = mutableMapOf<String, List<String>>()
        decksObj.keys().forEach { key -> decks[key] = resolveDeck(decksObj.optJSONArray(key)) }
        val settings = decodeSettings(obj.optJSONObject("settings") ?: JSONObject())
        val ench = obj.optJSONObject("enchantments") ?: JSONObject()
        return PersistentState(
            schemaVersion = obj.optInt("schemaVersion", 1),
            cards = cards,
            decks = decks,
            playerDeck = resolveDeck(obj.optJSONArray("playerDeck")),
            enemyDeck = resolveDeck(obj.optJSONArray("enemyDeck")),
            settings = settings,
            enchantments = EnchantmentManifest(
                player = decodeIntMap(ench.opt("player")),
                enemy = decodeIntMap(ench.opt("enemy"))
            )
        )
    }

    fun encodeCard(card: QteCard): JSONObject = JSONObject().apply {
        put("id", card.id)
        put("nombre", card.name)
        put("imageId", card.imageId ?: JSONObject.NULL)
        put("poder_bruto", card.rawPower)
        put("coeficiente", card.variationCoefficient)
        put("secciones", JSONArray().apply {
            card.sections.forEach { section ->
                put(JSONObject().apply {
                    put("id", section.id)
                    put("nombre", section.name)
                    put("tiempo", section.timeLimit)
                    put("botones", JSONArray(section.buttons.map { it.id }))
                })
            }
        })
        put("animation", encodeAnimation(card.animation))
        put("estadisticas", encodeStats(card.stats))
    }

    fun decodeCard(obj: JSONObject, index: Int = 0): QteCard {
        val sectionsArray = obj.optJSONArray("secciones") ?: JSONArray()
        val sections = buildList {
            for (i in 0 until sectionsArray.length()) {
                val sectionObj = sectionsArray.optJSONObject(i) ?: continue
                val buttonsArray = sectionObj.optJSONArray("botones") ?: JSONArray()
                val buttons = buildList {
                    for (j in 0 until buttonsArray.length()) QteButton.fromId(buttonsArray.optString(j))?.let(::add)
                }
                add(QteSection(
                    id = sectionObj.optString("id").ifBlank { "section-" + index + "-" + i },
                    name = sectionObj.optString("nombre", "Sección " + (i + 1)),
                    timeLimit = sectionObj.optDouble("tiempo", 2.0).coerceAtLeast(0.1),
                    buttons = buttons
                ))
            }
        }
        val base = QteCard(
            id = obj.optString("id").ifBlank { "card-" + (index + 1) + "-" + System.nanoTime() },
            name = obj.optString("nombre", "Carta " + (index + 1)),
            sections = if (sections.isEmpty()) listOf(QteSection(name = "Apertura", timeLimit = 2.0)) else sections,
            imageId = obj.optString("imageId").takeIf { it.isNotBlank() && it != "null" },
            animation = decodeAnimation(obj.optJSONObject("animation")),
            stats = decodeStats(obj.optJSONObject("estadisticas"))
        )
        return QteFormulas.refresh(base)
    }

    private fun encodeAnimation(a: AnimationConfig): JSONObject = JSONObject().apply {
        put("mode", a.mode); put("name", a.name); put("type", a.type); put("speed", a.speed)
        put("distance", a.distance); put("impacts", a.impacts); put("duration", a.duration)
        put("jumpHeight", a.jumpHeight); put("effectSize", a.effectSize); put("trailLength", a.trailLength)
        put("cameraShake", a.cameraShake); put("sound", a.sound); put("pauseAfter", a.pauseAfter)
        if (a.sequence.isNotEmpty()) put("sequence", JSONArray().apply {
            a.sequence.forEach { step -> put(JSONObject().apply {
                put("id", step.id); put("type", step.type); put("speed", step.speed); put("distance", step.distance)
                put("impacts", step.impacts); put("duration", step.duration); put("jumpHeight", step.jumpHeight)
                put("effectSize", step.effectSize); put("trailLength", step.trailLength); put("cameraShake", step.cameraShake)
                put("sound", step.sound); put("pauseAfter", step.pauseAfter)
            }) }
        })
    }

    private fun decodeAnimation(obj: JSONObject?): AnimationConfig {
        if (obj == null) return AnimationConfig()
        val sequenceArray = obj.optJSONArray("sequence")
        val sequence = if (sequenceArray == null) emptyList() else buildList {
            for (i in 0 until sequenceArray.length()) {
                val s = sequenceArray.optJSONObject(i) ?: continue
                val a = s.optJSONObject("animation") ?: s
                add(AnimationStep(
                    id = s.optString("id").ifBlank { "step-" + (i + 1) },
                    type = a.optString("type", "straight-punch"), speed = a.optDouble("speed", 1.0),
                    distance = a.optDouble("distance", 150.0), impacts = a.optInt("impacts", 1).coerceIn(1, 12),
                    duration = a.optDouble("duration", 0.82), jumpHeight = a.optDouble("jumpHeight", 70.0),
                    effectSize = a.optDouble("effectSize", 1.0), trailLength = a.optDouble("trailLength", 0.72),
                    cameraShake = a.optDouble("cameraShake", 0.55), sound = a.optString("sound", "impact"),
                    pauseAfter = s.optDouble("pauseAfter", a.optDouble("pauseAfter", 0.08))
                ))
            }
        }
        return AnimationConfig(
            mode = obj.optString("mode", if (sequence.isNotEmpty()) "sequence" else "single"),
            name = obj.optString("name", ""), type = obj.optString("type", "straight-punch"),
            speed = obj.optDouble("speed", 1.0), distance = obj.optDouble("distance", 150.0),
            impacts = obj.optInt("impacts", 1).coerceIn(1, 12), duration = obj.optDouble("duration", 0.82),
            jumpHeight = obj.optDouble("jumpHeight", 70.0), effectSize = obj.optDouble("effectSize", 1.0),
            trailLength = obj.optDouble("trailLength", 0.72), cameraShake = obj.optDouble("cameraShake", 0.55),
            sound = obj.optString("sound", "impact"), pauseAfter = obj.optDouble("pauseAfter", 0.08), sequence = sequence
        )
    }

    private fun encodeStats(s: CardStats): JSONObject = JSONObject().apply {
        put("usos", s.uses); put("victorias", s.wins); put("derrotas", s.losses)
        put("dano_promedio", s.averageDamage); put("tiempo_medio", s.averageTime); put("precision_media", s.averageAccuracy)
        put("mejor_poder_neto", s.bestNetPower); put("mayor_racha_perfecta", s.bestPerfectStreak)
        put("racha_perfecta_actual", s.currentPerfectStreak)
    }

    private fun decodeStats(obj: JSONObject?): CardStats {
        val o = obj ?: JSONObject()
        return CardStats(
            uses = o.optInt("usos", 0),
            wins = o.optInt("victorias", 0),
            losses = o.optInt("derrotas", 0),
            averageDamage = o.optDouble("dano_promedio", o.optDouble("daño_promedio", 0.0)),
            averageTime = o.optDouble("tiempo_medio", o.optDouble("tiempo_promedio", 0.0)),
            averageAccuracy = o.optDouble("precision_media", o.optDouble("precision_promedio", 0.0)),
            bestNetPower = o.optDouble("mejor_poder_neto", 0.0),
            bestPerfectStreak = o.optInt("mayor_racha_perfecta", 0),
            currentPerfectStreak = o.optInt("racha_perfecta_actual", 0)
        )
    }

    private fun encodeSettings(s: AppSettings): JSONObject = JSONObject().apply {
        put("difficulty", s.difficulty.label); put("musicVolume", s.musicVolume); put("safeMode", s.safeMode)
        put("playerEmblems", JSONArray(s.playerEmblems)); put("enemyEmblems", JSONArray(s.enemyEmblems))
        put("backgroundId", s.battleBackgroundId ?: JSONObject.NULL); put("backgroundType", s.battleBackgroundType)
        put("backgroundName", s.battleBackgroundName); put("backgroundOpacity", s.backgroundOpacity)
        put("overlayOpacity", s.overlayOpacity); put("backgroundBlur", s.backgroundBlur)
        put("musicTracks", JSONArray(s.musicTracks)); put("selectedMusicId", s.selectedMusicId ?: JSONObject.NULL)
        put("lastMusicId", s.lastMusicId ?: JSONObject.NULL); put("musicRandom", s.randomMusic)
    }

    private fun decodeSettings(obj: JSONObject): AppSettings = AppSettings(
        difficulty = Difficulty.fromLabel(obj.optString("difficulty", "Normal")),
        musicVolume = obj.optInt("musicVolume", 35).coerceIn(0, 100),
        safeMode = obj.optBoolean("safeMode", true),
        playerEmblems = decodeStringArray(obj.optJSONArray("playerEmblems")).ifEmpty { listOf("shadow") }.take(4),
        enemyEmblems = decodeStringArray(obj.optJSONArray("enemyEmblems")).ifEmpty { listOf("assassin") }.take(4),
        battleBackgroundId = obj.optString("backgroundId").takeIf { it.isNotBlank() && it != "null" },
        battleBackgroundType = obj.optString("backgroundType", ""),
        battleBackgroundName = obj.optString("backgroundName", ""),
        backgroundOpacity = obj.optInt("backgroundOpacity", 25).coerceIn(0, 100),
        overlayOpacity = obj.optInt("overlayOpacity", 68).coerceIn(0, 100),
        backgroundBlur = obj.optInt("backgroundBlur", 2).coerceIn(0, 24),
        musicTracks = decodeStringArray(obj.optJSONArray("musicTracks")),
        selectedMusicId = obj.optString("selectedMusicId").takeIf { it.isNotBlank() && it != "null" },
        lastMusicId = obj.optString("lastMusicId").takeIf { it.isNotBlank() && it != "null" },
        randomMusic = obj.optBoolean("musicRandom", true)
    )

    private fun decodeStringArray(array: JSONArray?): List<String> = if (array == null) emptyList() else buildList {
        for (i in 0 until array.length()) array.optString(i).takeIf(String::isNotBlank)?.let(::add)
    }

    private fun encodeIntMap(map: Map<Int, String>) = JSONObject().apply { map.forEach { (k, v) -> put(k.toString(), v) } }
    private fun decodeIntMap(value: Any?): Map<Int, String> {
        return when (value) {
            is JSONObject -> buildMap {
                value.keys().forEach { key -> key.toIntOrNull()?.let { put(it, value.optString(key)) } }
            }
            is JSONArray -> buildMap {
                for (i in 0 until value.length()) value.optString(i).takeIf(String::isNotBlank)?.let { put(i, it) }
            }
            else -> emptyMap()
        }
    }
}
