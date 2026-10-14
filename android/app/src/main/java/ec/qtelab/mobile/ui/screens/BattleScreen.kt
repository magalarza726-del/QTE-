package ec.qtelab.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import ec.qtelab.mobile.data.PersistentState
import ec.qtelab.mobile.data.QteCard
import ec.qtelab.mobile.domain.BalanceRules
import ec.qtelab.mobile.domain.EmblemCatalog
import ec.qtelab.mobile.ui.components.CardArt
import ec.qtelab.mobile.ui.components.CombatStage
import ec.qtelab.mobile.ui.components.QteButtonPad
import ec.qtelab.mobile.ui.components.StatPill
import ec.qtelab.mobile.viewmodel.BattleUiState
import ec.qtelab.mobile.viewmodel.QteViewModel
import java.io.File

@Composable
fun BattleScreen(state: PersistentState, battle: BattleUiState, vm: QteViewModel, wide: Boolean) {
    if (!battle.active) {
        Box(Modifier.fillMaxSize().padding(18.dp), contentAlignment = Alignment.Center) {
            Surface(shape = RoundedCornerShape(24.dp), tonalElevation = 4.dp) {
                Column(
                    Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text("Arena QTE", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
                    Button(onClick = vm::beginPreparation, modifier = Modifier.fillMaxWidth()) { Text("Preparar partida") }
                    OutlinedButton(onClick = vm::continueToDecks, modifier = Modifier.fillMaxWidth()) { Text("Decks") }
                }
            }
        }
        return
    }

    val qteVisible = battle.previewActive || battle.qteActive
    val background = vm.mediaFile(state.settings.battleBackgroundId)

    if (wide) {
        Row(
            Modifier.fillMaxSize().padding(10.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Column(
                Modifier.weight(1f).fillMaxHeight(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                BattleHeader(battle)
                CombatStageForBattle(state, battle, background, Modifier.weight(1f).fillMaxWidth())
                if (!qteVisible && !battle.animationActive) {
                    HandRow(battle, vm, Modifier.fillMaxWidth())
                }
            }
            if (qteVisible) {
                QtePanel(state, battle, vm, Modifier.weight(1f).fillMaxHeight())
            } else if (!battle.animationActive) {
                Box(Modifier.weight(1f).fillMaxHeight(), contentAlignment = Alignment.Center) {
                    if (battle.winner != null) {
                        Button(onClick = vm::beginPreparation) { Text("Preparar nueva partida") }
                    }
                }
            }
        }
    } else {
        Column(
            Modifier.fillMaxSize().padding(horizontal = 8.dp, vertical = 6.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            BattleHeader(battle)

            when {
                battle.animationActive -> {
                    CombatStageForBattle(
                        state,
                        battle,
                        background,
                        Modifier.weight(1f).fillMaxWidth()
                    )
                }
                qteVisible -> {
                    CombatStageForBattle(
                        state,
                        battle,
                        background,
                        Modifier.fillMaxWidth().height(112.dp)
                    )
                    QtePanel(state, battle, vm, Modifier.weight(1f).fillMaxWidth())
                }
                else -> {
                    CombatStageForBattle(
                        state,
                        battle,
                        background,
                        Modifier.weight(1f).fillMaxWidth()
                    )
                    HandRow(battle, vm, Modifier.fillMaxWidth())
                }
            }
        }
    }
}

@Composable
private fun CombatStageForBattle(
    state: PersistentState,
    battle: BattleUiState,
    background: File?,
    modifier: Modifier
) {
    CombatStage(
        playerEmblem = battle.executionEmblemId ?: battle.chosenPlayerCardId?.let(battle.playerEmblems::get),
        enemyEmblem = battle.chosenEnemyCardId?.let(battle.enemyEmblems::get),
        hitPulse = battle.hitPulse,
        attackSide = battle.animationSide,
        attackProgress = battle.animationProgress,
        attackType = battle.animationType,
        modifier = modifier,
        backgroundFile = background,
        backgroundOpacity = state.settings.backgroundOpacity,
        overlayOpacity = state.settings.overlayOpacity,
        safeMode = state.settings.safeMode
    )
}

@Composable
private fun BattleHeader(b: BattleUiState) {
    Surface(shape = RoundedCornerShape(18.dp), tonalElevation = 2.dp) {
        Column(
            Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("JUGADOR  " + "%.1f".format(b.playerHp), fontWeight = FontWeight.Bold)
                Text("T" + b.turn, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Black)
                Text("%.1f".format(b.enemyHp) + "  RIVAL", fontWeight = FontWeight.Bold)
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                LinearProgressIndicator(
                    progress = { (b.playerHp / BalanceRules.MAX_HP).toFloat().coerceIn(0f, 1f) },
                    modifier = Modifier.weight(1f).height(5.dp)
                )
                LinearProgressIndicator(
                    progress = { (b.enemyHp / BalanceRules.MAX_HP).toFloat().coerceIn(0f, 1f) },
                    modifier = Modifier.weight(1f).height(5.dp),
                    color = MaterialTheme.colorScheme.secondary
                )
            }
        }
    }
}

@Composable
private fun QtePanel(
    state: PersistentState,
    b: BattleUiState,
    vm: QteViewModel,
    modifier: Modifier = Modifier
) {
    val card = state.cards.firstOrNull { it.id == b.executionCardId }
    val section = card?.sections?.getOrNull(b.sectionIndex) ?: card?.sections?.firstOrNull()
    val buttons = section?.buttons.orEmpty()
    val emblem = EmblemCatalog.get(b.executionEmblemId)
    val sequenceState = rememberLazyListState()

    LaunchedEffect(b.sectionIndex, b.buttonIndex, buttons.size, b.sequenceVisible) {
        if (b.sequenceVisible && buttons.isNotEmpty()) {
            sequenceState.animateScrollToItem(b.buttonIndex.coerceIn(0, buttons.lastIndex))
        }
    }

    Surface(modifier, shape = RoundedCornerShape(22.dp), tonalElevation = 3.dp) {
        Column(
            Modifier.fillMaxSize().padding(horizontal = 10.dp, vertical = 9.dp),
            verticalArrangement = Arrangement.spacedBy(7.dp)
        ) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(9.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (card != null) {
                    CardArt(
                        cardId = card.id,
                        file = vm.mediaFile(card.imageId),
                        tintColor = emblem?.let { Color(it.colorHex) },
                        modifier = Modifier.width(94.dp).height(52.dp)
                    )
                }
                Column(Modifier.weight(1f)) {
                    Text(
                        card?.name ?: "QTE",
                        fontWeight = FontWeight.Black,
                        style = MaterialTheme.typography.titleMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (emblem != null) {
                        Text(
                            emblem.icon + " " + emblem.name,
                            color = Color(emblem.colorHex),
                            style = MaterialTheme.typography.labelMedium,
                            maxLines = 1
                        )
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        "%.2f s".format(if (b.previewActive) b.previewRemaining else b.timeRemaining),
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Black
                    )
                    if (b.previewActive) {
                        Text("MEMORIZA", style = MaterialTheme.typography.labelSmall, color = Color(0xFFC896FF))
                    }
                }
            }

            if (!b.previewActive) {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    StatPill("Prec.", "%.0f%%".format(b.accuracy))
                    StatPill("PN", "%.2f".format(b.netPower))
                    StatPill("✓", b.correct.toString())
                    StatPill("✕", b.incorrect.toString())
                }
            }

            if (b.sequenceVisible) {
                LazyRow(
                    state = sequenceState,
                    modifier = Modifier.fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .40f), RoundedCornerShape(14.dp))
                        .padding(vertical = 7.dp),
                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                    contentPadding = PaddingValues(horizontal = 7.dp)
                ) {
                    itemsIndexed(buttons) { index, button ->
                        val active = !b.previewActive && index == b.buttonIndex
                        Box(
                            Modifier.size(38.dp).border(
                                if (active) 2.dp else 1.dp,
                                if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                                RoundedCornerShape(10.dp)
                            ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(button.label, fontWeight = FontWeight.Black)
                        }
                    }
                }
            } else {
                Box(
                    Modifier.fillMaxWidth().height(44.dp)
                        .background(Color.Black.copy(alpha = .58f), RoundedCornerShape(14.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "SECUENCIA OCULTA",
                        fontWeight = FontWeight.Black,
                        color = Color(0xFFC896FF)
                    )
                }
            }

            if (b.qteActive) {
                QteButtonPad(
                    onPress = vm::submitInput,
                    modifier = Modifier.fillMaxWidth(),
                    compact = true,
                    enabled = true
                )
            } else if (b.previewActive) {
                Spacer(Modifier.weight(1f))
                LinearProgressIndicator(
                    progress = {
                        val total = EmblemCatalog.get(b.executionEmblemId)?.hideSequenceAfterSeconds ?: 3.0
                        (b.previewRemaining / total).toFloat().coerceIn(0f, 1f)
                    },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun HandRow(b: BattleUiState, vm: QteViewModel, modifier: Modifier = Modifier) {
    if (b.winner != null) {
        Button(onClick = vm::beginPreparation, modifier = modifier) {
            Text("Preparar nueva partida")
        }
        return
    }

    Row(modifier, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        b.playerHand.forEach { id ->
            val card = vm.cardById(id)
            val emblem = EmblemCatalog.get(b.playerEmblems[id])
            if (card != null) {
                HandCard(
                    card = card,
                    imageFile = vm.mediaFile(card.imageId),
                    emblemIcon = emblem?.icon,
                    emblemColor = emblem?.colorHex,
                    enabled = !b.qteActive && !b.previewActive && !b.animationActive,
                    onClick = { vm.chooseBattleCard(id) }
                )
            }
        }
        repeat((3 - b.playerHand.size).coerceAtLeast(0)) {
            Spacer(Modifier.weight(1f))
        }
    }
}

@Composable
private fun RowScope.HandCard(
    card: QteCard,
    imageFile: File?,
    emblemIcon: String?,
    emblemColor: Long?,
    enabled: Boolean,
    onClick: () -> Unit
) {
    val color = emblemColor?.let(::Color) ?: MaterialTheme.colorScheme.outline
    Surface(
        modifier = Modifier.weight(1f)
            .height(112.dp)
            .border(1.dp, color.copy(alpha = .82f), RoundedCornerShape(15.dp))
            .clickable(enabled = enabled, onClick = onClick),
        shape = RoundedCornerShape(15.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = if (enabled) .76f else .38f)
    ) {
        Column(Modifier.padding(6.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            CardArt(
                cardId = card.id,
                file = imageFile,
                tintColor = emblemColor?.let(::Color),
                modifier = Modifier.fillMaxWidth().height(43.dp)
            )
            Text(
                (emblemIcon?.plus(" ") ?: "") + card.name,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                "PB " + "%.2f".format(card.rawPower),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
