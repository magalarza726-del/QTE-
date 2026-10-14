package ec.qtelab.mobile.viewmodel

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import ec.qtelab.mobile.data.*
import ec.qtelab.mobile.domain.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.io.File
import kotlin.math.max
import kotlin.random.Random

enum class AppScreen { HOME, CARDS, EMBLEMS, DECKS, BATTLE, MEDIA, DATA }
enum class DeckSide { PLAYER, ENEMY }

data class BattleUiState(
    val active: Boolean = false,
    val playerHp: Double = BalanceRules.MAX_HP,
    val enemyHp: Double = BalanceRules.MAX_HP,
    val turn: Int = 1,
    val playerHand: List<String> = emptyList(),
    val enemyHand: List<String> = emptyList(),
    val playerDrawPile: List<String> = emptyList(),
    val enemyDrawPile: List<String> = emptyList(),
    val playerEmblems: Map<String, String> = emptyMap(),
    val enemyEmblems: Map<String, String> = emptyMap(),
    val chosenPlayerCardId: String? = null,
    val chosenEnemyCardId: String? = null,
    val executionCardId: String? = null,
    val executionEmblemId: String? = null,
    val qteActive: Boolean = false,
    val previewActive: Boolean = false,
    val previewRemaining: Double = 0.0,
    val sequenceVisible: Boolean = true,
    val animationActive: Boolean = false,
    val animationSide: String? = null,
    val animationProgress: Float = 0f,
    val animationType: String? = null,
    val sectionIndex: Int = 0,
    val buttonIndex: Int = 0,
    val expectedButton: QteButton? = null,
    val timeRemaining: Double = 0.0,
    val correct: Int = 0,
    val incorrect: Int = 0,
    val missed: Int = 0,
    val accuracy: Double = 0.0,
    val netPower: Double = 0.0,
    val lastResult: ExecutionResult? = null,
    val message: String = "Configura tus emblemas y decks para comenzar.",
    val hitPulse: Int = 0,
    val winner: String? = null,
    val battleMusicId: String? = null
)

data class AppUiState(
    val persistent: PersistentState = PersistentState(),
    val screen: AppScreen = AppScreen.HOME,
    val loading: Boolean = true,
    val battle: BattleUiState = BattleUiState(),
    val toast: String? = null
)

class QteViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = QteRepository(application)
    private val saveMutex = Mutex()
    private val _ui = MutableStateFlow(AppUiState())
    val ui: StateFlow<AppUiState> = _ui.asStateFlow()

    private var engine: QteEngine? = null
    private var ticker: Job? = null
    private var previewJob: Job? = null
    private var animationJob: Job? = null
    private var resolvingTurn: Boolean = false
    private val usedPlayerCards = linkedSetOf<String>()
    private val usedEnemyCards = linkedSetOf<String>()

    init {
        viewModelScope.launch(Dispatchers.IO) {
            val state = repository.load()
            _ui.value = AppUiState(persistent = state, loading = false)
        }
    }

    fun navigate(screen: AppScreen) { _ui.value = _ui.value.copy(screen = screen) }
    fun beginPreparation() { navigate(AppScreen.EMBLEMS) }
    fun continueToDecks() { navigate(AppScreen.DECKS) }
    fun consumeToast() { _ui.value = _ui.value.copy(toast = null) }
    private fun toast(text: String) { _ui.value = _ui.value.copy(toast = text) }

    private fun updatePersistent(transform: (PersistentState) -> PersistentState) {
        val next = transform(_ui.value.persistent)
        _ui.value = _ui.value.copy(persistent = next)
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                saveMutex.withLock {
                    // Si llegaron más cambios mientras esperábamos el mutex, persistimos el estado más reciente.
                    repository.save(_ui.value.persistent)
                }
            }.onFailure { toast("No se pudo guardar: ${it.message}") }
        }
    }

    fun saveCard(card: QteCard) {
        val normalized = QteFormulas.refresh(card.copy(name = card.name.trim().ifBlank { "Nueva carta" }))
        updatePersistent { state ->
            val index = state.cards.indexOfFirst { it.id == normalized.id }
            val cards = if (index >= 0) state.cards.toMutableList().also { it[index] = normalized } else state.cards + normalized
            state.copy(cards = cards)
        }
        toast("Carta guardada")
    }

    fun deleteCard(cardId: String) {
        val image = _ui.value.persistent.cards.firstOrNull { it.id == cardId }?.imageId
        updatePersistent { state ->
            state.copy(
                cards = state.cards.filterNot { it.id == cardId },
                playerDeck = state.playerDeck.filterNot { it == cardId },
                enemyDeck = state.enemyDeck.filterNot { it == cardId },
                decks = state.decks.mapValues { (_, ids) -> ids.filterNot { it == cardId } }
            )
        }
        viewModelScope.launch(Dispatchers.IO) { image?.let(repository.media::delete) }
    }

    fun attachImage(cardId: String, uri: Uri) {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                val old = _ui.value.persistent.cards.firstOrNull { it.id == cardId }?.imageId
                val id = repository.importCardImage(uri)
                val state = _ui.value.persistent
                val cards = state.cards.map { if (it.id == cardId) it.copy(imageId = id) else it }
                val next = state.copy(cards = cards)
                saveMutex.withLock { repository.save(next) }
                _ui.value = _ui.value.copy(persistent = next, toast = "Imagen asignada")
                if (old != null && old != id) repository.media.delete(old)
            }.onFailure { toast("No se pudo importar la imagen: ${it.message}") }
        }
    }

    fun mediaFile(id: String?): File? = repository.media.fileFor(id)
    fun mediaMeta(id: String?): MediaMeta? = repository.media.meta(id)

    fun importBattleBacksround(uri: Uri) {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                val old = _ui.value.persistent.settings.battleBackgroundId
                val id = repository.media.importUri(uri)
                val meta = repository.media.meta(id) ?: error("No se pudo registrar el fondo.")
                val current = _ui.value.persistent
                val next = current.copy(settings = current.settings.copy(
                    battleBackgroundId = id,
                    battleBackgroundType = meta.type,
                    battleBackgroundName = meta.name
                ))
                saveMutex.withLock { repository.save(next) }
                _ui.value = _ui.value.copy(persistent = next, toast = "Fondo de batalla importado")
                if (old != null && old != id) repository.media.delete(old)
            }.onFailure { toast("No se pudo importar el fondo: ${it.message}") }
        }
    }

    fun removeBattleBackground() {
        val old = _ui.value.persistent.settings.battleBackgroundId
        updatePersistent { state ->
            state.copy(settings = state.settings.copy(
                battleBackgroundId = null, battleBackgroundType = "", battleBackgroundName = ""
            ))
        }
        viewModelScope.launch(Dispatchers.IO) { old?.let(repository.media::delete) }
    }

    fun importMusicTracks(uris: List<Uri>) {
        if (uris.isEmpty()) return
        viewModelScope.launch(Dispatchers.IO) {
            val current = _ui.value.persistent
            val capacity = (20 - current.settings.musicTracks.size).coerceAtLeast(0)
            if (capacity == 0) { toast("La biblioteca admite hasta 20 pistas."); return@launch }
            val imported = mutableListOf<String>()
            runCatching {
                uris.take(capacity).forEach { uri -> imported += repository.media.importUri(uri) }
                val latest = _ui.value.persistent
                val tracks = (latest.settings.musicTracks + imported).distinct().take(20)
                val next = latest.copy(settings = latest.settings.copy(
                    musicTracks = tracks,
                    selectedMusicId = latest.settings.selectedMusicId?.takeIf { it in tracks } ?: tracks.firstOrNull()
                ))
                saveMutex.withLock { repository.save(next) }
                _ui.value = _ui.value.copy(persistent = next, toast = "${imported.size} pista(s) importada(s)")
            }.onFailure { error ->
                imported.forEach { runCatching { repository.media.delete(it) } }
                toast("No se pudo importar la música: ${error.message}")
            }
        }
    }

    fun removeMusicTrack(id: String) {
        updatePersistent { state ->
            val tracks = state.settings.musicTracks.filterNot { it == id }
            state.copy(settings = state.settings.copy(
                musicTracks = tracks,
                selectedMusicId = state.settings.selectedMusicId?.takeIf { it in tracks },
                lastMusicId = state.settings.lastMusicId?.takeIf { it in tracks }
            ))
        }
        viewModelScope.launch(Dispatchers.IO) { repository.media.delete(id) }
    }

    fun selectMusicTrack(id: String?) = updatePersistent { state ->
        state.copy(settings = state.settings.copy(selectedMusicId = id?.takeIf { it in state.settings.musicTracks }))
    }
    fun setRandomMusic(enabled: Boolean) = updatePersistent { it.copy(settings = it.settings.copy(randomMusic = enabled)) }
    fun setMusicVolume(value: Int) = updatePersistent { it.copy(settings = it.settings.copy(musicVolume = value.coerceIn(0, 100))) }
    fun setSafeMode(enabled: Boolean) = updatePersistent { it.copy(settings = it.settings.copy(safeMode = enabled)) }
    fun setBackgroundOpacity(value: Int) = updatePersistent { it.copy(settings = it.settings.copy(backgroundOpacity = value.coerceIn(0, 100))) }
    fun setOverlayOpacity(value: Int) = updatePersistent { it.copy(settings = it.settings.copy(overlayOpacity = value.coerceIn(0, 100))) }
    fun setBackgroundBlur(value: Int) = updatePersistent { it.copy(settings = it.settings.copy(backgroundBlur = value.coerceIn(0, 24))) }

    fun setDifficulty(value: Difficulty) = updatePersistent { it.copy(settings = it.settings.copy(difficulty = value)) }

    fun toggleEmblem(side: DeckSide, emblemId: String) {
        updatePersistent { state ->
            val current = if (side == DeckSide.PLAYER) state.settings.playerEmblems else state.settings.enemyEmblems
            val next = if (emblemId in current) current - emblemId else if (current.size < 4) current + emblemId else current
            val safe = next.ifEmpty { current }
            val settings = if (side == DeckSide.PLAYER) state.settings.copy(playerEmblems = safe) else state.settings.copy(enemyEmblems = safe)
            val enchantments = if (side == DeckSide.PLAYER) {
                state.enchantments.copy(player = EmblemDistributor.distribute(safe, state.playerDeck.size))
            } else {
                state.enchantments.copy(enemy = EmblemDistributor.distribute(safe, state.enemyDeck.size))
            }
            state.copy(settings = settings, enchantments = enchantments)
        }
    }

    fun randomizeEnchantments() {
        updatePersistent { state ->
            state.copy(enchantments = EnchantmentManifest(
                player = EmblemDistributor.distribute(state.settings.playerEmblems, state.playerDeck.size),
                enemy = EmblemDistributor.distribute(state.settings.enemyEmblems, state.enemyDeck.size)
            ))
        }
    }

    fun toggleDeckCard(side: DeckSide, cardId: String) {
        val currentNow = if (side == DeckSide.PLAYER) _ui.value.persistent.playerDeck else _ui.value.persistent.enemyDeck
        if (cardId !in currentNow && currentNow.size >= DeckRules.MAX_CARDS) {
            toast("Máximo " + DeckRules.MAX_CARDS + " cartas por deck.")
            return
        }
        updatePersistent { state ->
            val current = if (side == DeckSide.PLAYER) state.playerDeck else state.enemyDeck
            val next = if (cardId in current) current - cardId else if (current.size < DeckRules.MAX_CARDS) current + cardId else current
            if (side == DeckSide.PLAYER) {
                state.copy(
                    playerDeck = next,
                    enchantments = state.enchantments.copy(player = EmblemDistributor.distribute(state.settings.playerEmblems, next.size))
                )
            } else {
                state.copy(
                    enemyDeck = next,
                    enchantments = state.enchantments.copy(enemy = EmblemDistributor.distribute(state.settings.enemyEmblems, next.size))
                )
            }
        }
    }

    fun loadDeck(name: String, side: DeckSide) {
        val deck = _ui.value.persistent.decks[name].orEmpty().take(DeckRules.MAX_CARDS)
        updatePersistent { state ->
            if (side == DeckSide.PLAYER) {
                state.copy(
                    playerDeck = deck,
                    enchantments = state.enchantments.copy(player = EmblemDistributor.distribute(state.settings.playerEmblems, deck.size))
                )
            } else {
                state.copy(
                    enemyDeck = deck,
                    enchantments = state.enchantments.copy(enemy = EmblemDistributor.distribute(state.settings.enemyEmblems, deck.size))
                )
            }
        }
    }

    fun saveCurrentDeck(name: String, side: DeckSide) {
        val trimmed = name.trim()
        if (trimmed.isBlank()) {
            toast("Escribe un nombre para el deck.")
            return
        }
        val ids = if (side == DeckSide.PLAYER) _ui.value.persistent.playerDeck else _ui.value.persistent.enemyDeck
        if (!DeckRules.isValid(ids.size)) {
            toast("El deck debe tener entre ${DeckRules.MIN_CARDS} y ${DeckRules.MAX_CARDS} cartas.")
            return
        }
        updatePersistent { state ->
            state.copy(decks = state.decks + (trimmed to ids))
        }
        toast("Deck guardado")
    }

    fun startBattle() {
        val p = _ui.value.persistent
        if (!DeckRules.isValid(p.playerDeck.size) || !DeckRules.isValid(p.enemyDeck.size)) {
            toast("Cada deck debe tener entre ${DeckRules.MIN_CARDS} y ${DeckRules.MAX_CARDS} cartas.")
            navigate(AppScreen.DECKS)
            return
        }
        if (p.settings.playerEmblems.isEmpty() || p.settings.enemyEmblems.isEmpty()) {
            toast("Selecciona al menos un emblema para cada lado.")
            navigate(AppScreen.EMBLEMS)
            return
        }
        val pManifest = p.enchantments.player.takeIf { it.size == p.playerDeck.size }
            ?: EmblemDistributor.distribute(p.settings.playerEmblems, p.playerDeck.size)
        val eManifest = p.enchantments.enemy.takeIf { it.size == p.enemyDeck.size }
            ?: EmblemDistributor.distribute(p.settings.enemyEmblems, p.enemyDeck.size)
        val playerEmblems = p.playerDeck.mapIndexedNotNull { i, id -> pManifest[i]?.let { id to it } }.toMap()
        val enemyEmblems = p.enemyDeck.mapIndexedNotNull { i, id -> eManifest[i]?.let { id to it } }.toMap()
        val pDeck = p.playerDeck.shuffled()
        val eDeck = p.enemyDeck.shuffled()
        usedPlayerCards.clear(); usedEnemyCards.clear()
        engine = null
        ticker?.cancel(); ticker = null
        previewJob?.cancel(); previewJob = null
        animationJob?.cancel(); animationJob = null
        resolvingTurn = false
        val availableTracks = p.settings.musicTracks.filter { repository.media.fileFor(it) != null }
        val musicId = if (availableTracks.isEmpty()) null else if (p.settings.randomMusic) {
            val candidates = availableTracks.filterNot { it == p.settings.lastMusicId }.ifEmpty { availableTracks }
            candidates.randomOrNull()
        } else {
            p.settings.selectedMusicId?.takeIf { it in availableTracks } ?: availableTracks.firstOrNull()
        }
        val persistent = p.copy(
            enchantments = EnchantmentManifest(pManifest, eManifest),
            settings = p.settings.copy(lastMusicId = musicId)
        )
        _ui.value = _ui.value.copy(
            persistent = persistent,
            screen = AppScreen.BATTLE,
            battle = BattleUiState(
                active = true,
                playerHand = pDeck.take(DeckRules.HAND_SIZE), enemyHand = eDeck.take(DeckRules.HAND_SIZE),
                playerDrawPile = pDeck.drop(DeckRules.HAND_SIZE), enemyDrawPile = eDeck.drop(DeckRules.HAND_SIZE),
                playerEmblems = playerEmblems, enemyEmblems = enemyEmblems,
                battleMusicId = musicId,
                message = "Elige una carta para ejecutar su QTE."
            )
        )
        viewModelScope.launch(Dispatchers.IO) { saveMutex.withLock { repository.save(persistent) } }
    }

    fun chooseBattleCard(cardId: String) {
        val uiState = _ui.value
        val battle = uiState.battle
        if (!battle.active || battle.qteActive || battle.previewActive || battle.animationActive ||
            battle.winner != null || cardId !in battle.playerHand) return

        val enemyChoice = battle.enemyHand.randomOrNull() ?: return
        val playerEmblem = battle.playerEmblems[cardId]
        val enemyEmblem = battle.enemyEmblems[enemyChoice]
        val mirror = EmblemCatalog.get(playerEmblem)?.mirror == true ||
            EmblemCatalog.get(enemyEmblem)?.mirror == true
        val executionId = if (mirror) enemyChoice else cardId
        val executionEmblem = if (mirror) enemyEmblem else playerEmblem
        val card = cardById(executionId) ?: return
        val emblem = EmblemCatalog.get(executionEmblem)
        val timeMultiplier = emblem?.timeMultiplier ?: 1.0
        val previewSeconds = emblem?.hideSequenceAfterSeconds?.coerceAtLeast(0.0) ?: 0.0

        engine = null
        ticker?.cancel(); ticker = null
        previewJob?.cancel(); previewJob = null

        _ui.value = uiState.copy(battle = battle.copy(
            chosenPlayerCardId = cardId,
            chosenEnemyCardId = enemyChoice,
            executionCardId = executionId,
            executionEmblemId = executionEmblem,
            qteActive = previewSeconds <= 0.0,
            previewActive = previewSeconds > 0.0,
            previewRemaining = previewSeconds,
            sequenceVisible = true,
            sectionIndex = 0,
            buttonIndex = 0,
            expectedButton = card.sections.firstOrNull()?.buttons?.firstOrNull(),
            timeRemaining = if (previewSeconds > 0.0) previewSeconds else card.sections.firstOrNull()?.timeLimit?.times(timeMultiplier) ?: 0.0,
            correct = 0,
            incorrect = 0,
            missed = 0,
            accuracy = 0.0,
            netPower = 0.0,
            lastResult = null,
            message = if (previewSeconds > 0.0) "Memoriza la secuencia." else if (mirror) "Clan Espejo." else ""
        ))

        if (previewSeconds > 0.0) {
            startShadowPreview(card, timeMultiplier, previewSeconds)
        } else {
            startQteEngine(card, timeMultiplier, sequenceVisible = true)
        }
    }

    private fun startShadowPreview(card: QteCard, timeMultiplier: Double, seconds: Double) {
        previewJob?.cancel()
        previewJob = viewModelScope.launch {
            val started = System.nanoTime()
            while (true) {
                val elapsed = (System.nanoTime() - started) / 1_000_000_000.0
                val remaining = (seconds - elapsed).coerceAtLeast(0.0)
                val battle = _ui.value.battle
                if (!battle.previewActive) return@launch
                _ui.value = _ui.value.copy(battle = battle.copy(
                    previewRemaining = remaining,
                    timeRemaining = remaining,
                    sequenceVisible = true
                ))
                if (remaining <= 0.0) break
                delay(33)
            }
            previewJob = null
            startQteEngine(card, timeMultiplier, sequenceVisible = false)
        }
    }

    private fun startQteEngine(card: QteCard, timeMultiplier: Double, sequenceVisible: Boolean) {
        val qte = QteEngine(card, timeMultiplier).start()
        engine = qte
        val battle = _ui.value.battle
        _ui.value = _ui.value.copy(battle = battle.copy(
            previewActive = false,
            previewRemaining = 0.0,
            qteActive = true,
            sequenceVisible = sequenceVisible,
            sectionIndex = qte.sectionIndex,
            buttonIndex = qte.buttonIndex,
            expectedButton = qte.expectedButton,
            timeRemaining = qte.sectionRemaining,
            message = ""
        ))
        startTicker()
    }

    fun submitInput(button: QteButton): Boolean {
        val eng = engine ?: return false
        if (!eng.active) return false
        val correctInput = eng.input(button)
        syncEngineState()
        if (eng.finished) resolveTurn(eng.finish())
        return correctInput
    }

    private fun startTicker() {
        ticker?.cancel()
        ticker = viewModelScope.launch {
            while (engine?.active == true) {
                delay(32)
                engine?.tick()
                syncEngineState()
                val eng = engine
                if (eng?.finished == true) {
                    resolveTurn(eng.finish())
                    break
                }
            }
        }
    }

    private fun syncEngineState() {
        val eng = engine ?: return
        val b = _ui.value.battle
        val card = cardById(b.executionCardId)
        val total = card?.let(QteFormulas::totalButtons) ?: 0
        val shadow = EmblemCatalog.get(b.executionEmblemId)?.hideSequenceAfterSeconds != null
        val acc = QteFormulas.accuracy(eng.correct, total)
        val net = QteFormulas.netPower(
            eng.correct,
            max(eng.elapsedTime, 0.001),
            card?.let(QteFormulas::variationCoefficient) ?: 0.0
        )
        _ui.value = _ui.value.copy(battle = b.copy(
            sequenceVisible = !shadow,
            sectionIndex = eng.sectionIndex,
            buttonIndex = eng.buttonIndex,
            expectedButton = eng.expectedButton,
            timeRemaining = eng.sectionRemaining,
            correct = eng.correct,
            incorrect = eng.incorrect,
            missed = eng.missed,
            accuracy = acc,
            netPower = net
        ))
    }

    private fun resolveTurn(playerResult: ExecutionResult) {
        if (resolvingTurn) return
        resolvingTurn = true
        ticker?.cancel(); ticker = null
        previewJob?.cancel(); previewJob = null
        engine = null

        val app = _ui.value
        val b = app.battle
        val pOriginal = b.chosenPlayerCardId ?: run { resolvingTurn = false; return }
        val eOriginal = b.chosenEnemyCardId ?: run { resolvingTurn = false; return }
        val playerEmblem = b.playerEmblems[pOriginal]
        val enemyEmblem = b.enemyEmblems[eOriginal]
        val pExecCard = cardById(b.executionCardId) ?: run { resolvingTurn = false; return }
        val enemyExecCardId = if (pExecCard.id == eOriginal) pOriginal else eOriginal
        val enemyExecCard = cardById(enemyExecCardId) ?: run { resolvingTurn = false; return }
        val enemyExecEmblem = if (enemyExecCardId == pOriginal) playerEmblem else enemyEmblem
        val enemyResult = simulateEnemy(enemyExecCard, enemyExecEmblem, app.persistent.settings.difficulty)

        val enemyDefense = EmblemCatalog.get(enemyEmblem)?.incomingMultiplier ?: 1.0
        val playerDefense = EmblemCatalog.get(playerEmblem)?.incomingMultiplier ?: 1.0
        val playerDamage = BalanceRules.damage(playerResult, b.executionEmblemId, b.playerHp, enemyDefense)
        val enemyDamage = BalanceRules.damage(enemyResult, enemyExecEmblem, b.enemyHp, playerDefense)
        val effectivePlayerDamage = minOf(playerDamage, b.enemyHp)
        val effectiveEnemyDamage = minOf(enemyDamage, b.playerHp)
        val playerSelf = BalanceRules.selfDamage(playerResult, b.executionEmblemId, BalanceRules.maxDamagePerCard)
        val enemySelf = BalanceRules.selfDamage(enemyResult, enemyExecEmblem, BalanceRules.maxDamagePerCard)
        val playerHeal = BalanceRules.healing(effectivePlayerDamage, b.executionEmblemId)
        val enemyHeal = BalanceRules.healing(effectiveEnemyDamage, enemyExecEmblem)

        val playerAfterOwn = (b.playerHp - playerSelf + playerHeal).coerceIn(0.0, BalanceRules.MAX_HP)
        val enemyAfterPlayer = (b.enemyHp - effectivePlayerDamage).coerceIn(0.0, BalanceRules.MAX_HP)
        val playerFinal = (playerAfterOwn - effectiveEnemyDamage).coerceIn(0.0, BalanceRules.MAX_HP)
        val enemyFinal = (enemyAfterPlayer - enemySelf + enemyHeal).coerceIn(0.0, BalanceRules.MAX_HP)

        usedPlayerCards += pOriginal
        usedEnemyCards += eOriginal
        updateCardExecutionStats(pExecCard.id, playerResult, effectivePlayerDamage)

        val nextHands = rotateHands(b, pOriginal, eOriginal)
        val playerDuration = animationDurationMillis(pExecCard)
        val enemyDuration = animationDurationMillis(enemyExecCard)

        _ui.value = _ui.value.copy(battle = b.copy(
            qteActive = false,
            previewActive = false,
            previewRemaining = 0.0,
            sequenceVisible = true,
            expectedButton = null,
            lastResult = playerResult,
            accuracy = playerResult.accuracy,
            netPower = playerResult.netPower,
            animationActive = true,
            animationSide = "player",
            animationProgress = 0f,
            animationType = pExecCard.animation.type,
            message = ""
        ))

        animationJob?.cancel()
        animationJob = viewModelScope.launch {
            animateDamagePhase(
                side = "player",
                type = pExecCard.animation.type,
                durationMillis = playerDuration,
                startPlayerHp = b.playerHp,
                endPlayerHp = playerAfterOwn,
                startEnemyHp = b.enemyHp,
                endEnemyHp = enemyAfterPlayer
            )
            delay(120)
            animateDamagePhase(
                side = "enemy",
                type = enemyExecCard.animation.type,
                durationMillis = enemyDuration,
                startPlayerHp = playerAfterOwn,
                endPlayerHp = playerFinal,
                startEnemyHp = enemyAfterPlayer,
                endEnemyHp = enemyFinal
            )

            val winner = when {
                enemyFinal <= 0.0 && playerFinal <= 0.0 -> "Empate"
                enemyFinal <= 0.0 -> "Jugador"
                playerFinal <= 0.0 -> "Rival"
                else -> null
            }
            val current = _ui.value.battle
            _ui.value = _ui.value.copy(battle = current.copy(
                playerHp = playerFinal,
                enemyHp = enemyFinal,
                turn = if (winner == null) b.turn + 1 else b.turn,
                playerHand = nextHands.first.first,
                playerDrawPile = nextHands.first.second,
                enemyHand = nextHands.second.first,
                enemyDrawPile = nextHands.second.second,
                animationActive = false,
                animationSide = null,
                animationProgress = 0f,
                animationType = null,
                winner = winner,
                message = winner?.let {
                    if (it == "Empate") "Empate" else "$it gana"
                } ?: ""
            ))
            resolvingTurn = false
            animationJob = null
            if (winner != null) recordMatchResult(winner)
        }
    }

    private suspend fun animateDamagePhase(
        side: String,
        type: String,
        durationMillis: Long,
        startPlayerHp: Double,
        endPlayerHp: Double,
        startEnemyHp: Double,
        endEnemyHp: Double
    ) {
        val frameMillis = 33L
        val frames = (durationMillis / frameMillis).coerceAtLeast(1L).toInt()
        var impactFired = false
        for (frame in 0..frames) {
            val progress = frame.toFloat() / frames.toFloat()
            val hpProgress = ((progress - 0.45f) / 0.45f).coerceIn(0f, 1f)
            val current = _ui.value.battle
            val impactNow = !impactFired && progress >= 0.58f
            if (impactNow) impactFired = true
            _ui.value = _ui.value.copy(battle = current.copy(
                playerHp = lerpHp(startPlayerHp, endPlayerHp, hpProgress),
                enemyHp = lerpHp(startEnemyHp, endEnemyHp, hpProgress),
                animationActive = true,
                animationSide = side,
                animationProgress = progress,
                animationType = type,
                hitPulse = current.hitPulse + if (impactNow) 1 else 0
            ))
            if (frame < frames) delay(frameMillis)
        }
    }

    private fun animationDurationMillis(card: QteCard): Long {
        val animation = card.animation
        val baseSeconds = if (animation.mode == "sequence" && animation.sequence.isNotEmpty()) {
            animation.sequence.sumOf { it.duration.coerceAtLeast(0.12) + it.pauseAfter.coerceAtLeast(0.0) }
        } else {
            animation.duration.coerceAtLeast(0.35) + animation.pauseAfter.coerceAtLeast(0.0)
        }
        return (baseSeconds * 2150.0).toLong().coerceIn(1200L, 6500L)
    }

    private fun lerpHp(start: Double, end: Double, progress: Float): Double {
        return start + (end - start) * progress.coerceIn(0f, 1f)
    }

    private fun rotateHands(b: BattleUiState, playerUsed: String, enemyUsed: String): Pair<Pair<List<String>, List<String>>, Pair<List<String>, List<String>>> {
        fun rotate(hand: List<String>, pile: List<String>, used: String): Pair<List<String>, List<String>> {
            val nextHand = hand.filterNot { it == used }.toMutableList()
            val nextPile = pile.toMutableList()
            if (nextPile.isNotEmpty()) nextHand += nextPile.removeAt(0)
            return nextHand to nextPile
        }
        return rotate(b.playerHand, b.playerDrawPile, playerUsed) to rotate(b.enemyHand, b.enemyDrawPile, enemyUsed)
    }

    private fun simulateEnemy(card: QteCard, emblemId: String?, difficulty: Difficulty): ExecutionResult {
        val total = QteFormulas.totalButtons(card)
        val accuracyRange = when (difficulty) {
            Difficulty.EASY -> 0.50..0.70
            Difficulty.NORMAL -> 0.70..0.90
            Difficulty.HARD -> 0.90..0.99
        }
        val reactionRange = when (difficulty) {
            Difficulty.EASY -> 0.30..0.52
            Difficulty.NORMAL -> 0.18..0.34
            Difficulty.HARD -> 0.09..0.19
        }
        val accuracyRatio = Random.nextDouble(accuracyRange.start, accuracyRange.endInclusive)
        val correct = (total * accuracyRatio).toInt().coerceIn(0, total)
        val incorrect = (total - correct).coerceAtLeast(0)
        val timeMultiplier = EmblemCatalog.get(emblemId)?.timeMultiplier ?: 1.0
        val limit = QteFormulas.totalTime(card) * timeMultiplier
        val real = (correct.coerceAtLeast(1) * Random.nextDouble(reactionRange.start, reactionRange.endInclusive) + card.sections.size * 0.08)
            .coerceAtMost(limit.coerceAtLeast(0.1))
        val coef = QteFormulas.variationCoefficient(card)
        val net = QteFormulas.netPower(correct, real, coef)
        return ExecutionResult(correct, incorrect, 0, total, real, limit, QteFormulas.accuracy(correct, total), coef, net, net, "ia")
    }

    private fun updateCardExecutionStats(cardId: String, result: ExecutionResult, damage: Double) {
        updatePersistent { state ->
            val cards = state.cards.map { card ->
                if (card.id != cardId) card else {
                    val s = card.stats
                    val uses = s.uses + 1
                    fun avg(old: Double, value: Double) = (old * s.uses + value) / uses
                    val perfect = result.correct == result.total && result.incorrect == 0 && result.missed == 0
                    val streak = if (perfect) s.currentPerfectStreak + 1 else 0
                    card.copy(stats = s.copy(
                        uses = uses,
                        averageDamage = avg(s.averageDamage, damage),
                        averageTime = avg(s.averageTime, result.realTime),
                        averageAccuracy = avg(s.averageAccuracy, result.accuracy),
                        bestNetPower = max(s.bestNetPower, result.netPower),
                        currentPerfectStreak = streak,
                        bestPerfectStreak = max(s.bestPerfectStreak, streak)
                    ))
                }
            }
            state.copy(cards = cards)
        }
    }

    private fun recordMatchResult(winner: String) {
        updatePersistent { state ->
            val cards = state.cards.map { card ->
                when {
                    card.id in usedPlayerCards -> card.copy(stats = card.stats.copy(
                        wins = card.stats.wins + if (winner == "Jugador") 1 else 0,
                        losses = card.stats.losses + if (winner == "Rival") 1 else 0
                    ))
                    card.id in usedEnemyCards -> card
                    else -> card
                }
            }
            state.copy(cards = cards)
        }
    }

    fun writeBackup(uri: Uri) {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                val json = repository.exportBackup(_ui.value.persistent)
                getApplication<Application>().contentResolver.openOutputStream(uri, "wt")?.bufferedWriter()?.use { it.write(json) }
                    ?: error("No se pudo abrir el destino.")
            }.onSuccess { toast("Respaldo JSON exportado") }
                .onFailure { toast("Error al exportar: ${it.message}") }
        }
    }

    fun readBackup(uri: Uri) {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                val text = getApplication<Application>().contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
                    ?: error("No se pudo leer el archivo.")
                repository.importBackup(text)
            }.onSuccess { imported -> _ui.value = _ui.value.copy(persistent = imported, toast = "Configuración importada") }
                .onFailure { toast("JSON inválido o incompatible: ${it.message}") }
        }
    }

    fun resetAll() {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { repository.reset() }
                .onSuccess { _ui.value = AppUiState(persistent = it, loading = false, toast = "Datos restaurados") }
                .onFailure { toast("No se pudo restaurar: ${it.message}") }
        }
    }

    fun cardById(id: String?): QteCard? = id?.let { key -> _ui.value.persistent.cards.firstOrNull { it.id == key } }
}
