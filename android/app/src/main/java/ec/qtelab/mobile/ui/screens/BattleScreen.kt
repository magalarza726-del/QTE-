package ec.qtelab.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ec.qtelab.mobile.data.PersistentState
import ec.qtelab.mobile.data.QteCard
import ec.qtelab.mobile.domain.BalanceRules
import ec.qtelab.mobile.domain.EmblemCatalog
import ec.qtelab.mobile.ui.components.CombatStage
import ec.qtelab.mobile.ui.components.QteButtonPad
import ec.qtelab.mobile.ui.components.StatPill
import ec.qtelab.mobile.viewmodel.BattleUiState
import ec.qtelab.mobile.viewmodel.QteViewModel

@Composable
fun BattleScreen(state: PersistentState, battle: BattleUiState, vm: QteViewModel, wide: Boolean) {
    if (!battle.active) {
        Box(Modifier.fillMaxSize().padding(22.dp), contentAlignment = Alignment.Center) {
            Surface(shape = RoundedCornerShape(28.dp), tonalElevation = 5.dp) {
                Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Arena QTE", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
                    Text("Cada deck necesita 12 cartas. El combate funciona completamente sin conexión.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Button(onClick = vm::startBattle) { Text("Iniciar combate") }
                }
            }
        }
        return
    }

    if (wide) {
        Row(Modifier.fillMaxSize().padding(14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(Modifier.weight(.95f).fillMaxHeight(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                BattleHeader(battle)
                CombatStage(battle.executionEmblemId, battle.chosenEnemyCardId?.let(battle.enemyEmblems::get), battle.hitPulse, Modifier.weight(1f).fillMaxWidth())
                HandRow(battle, vm, Modifier.fillMaxWidth())
            }
            QtePanel(state,battle,vm,true,Modifier.weight(1.05f).fillMaxHeight())
        }
    } else {
        Column(Modifier.fillMaxSize().padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            BattleHeader(battle)
            CombatStage(battle.executionEmblemId, battle.chosenEnemyCardId?.let(battle.enemyEmblems::get), battle.hitPulse, Modifier.fillMaxWidth().height(165.dp))
            QtePanel(state,battle,vm,true,Modifier.weight(1f))
            HandRow(battle,vm,Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun BattleHeader(b: BattleUiState) {
    Surface(shape = RoundedCornerShape(20.dp), tonalElevation = 2.dp) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("JUGADOR  "+"%.1f".format(b.playerHp), fontWeight = FontWeight.Bold)
                Text("Turno "+b.turn, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Black)
                Text("%.1f".format(b.enemyHp)+"  RIVAL", fontWeight = FontWeight.Bold)
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                LinearProgressIndicator(progress = { (b.playerHp / BalanceRules.MAX_HP).toFloat() }, modifier = Modifier.weight(1f))
                LinearProgressIndicator(progress = { (b.enemyHp / BalanceRules.MAX_HP).toFloat() }, modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.secondary)
            }
            Text(b.message, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun QtePanel(state: PersistentState,b:BattleUiState,vm:QteViewModel,compact:Boolean,modifier:Modifier=Modifier) {
    val card=state.cards.firstOrNull{it.id==b.executionCardId}
    val section=card?.sections?.getOrNull(b.sectionIndex)
    val emblem=EmblemCatalog.get(b.executionEmblemId)
    Surface(modifier,shape=RoundedCornerShape(24.dp),tonalElevation=3.dp) {
        Column(Modifier.fillMaxSize().padding(12.dp),verticalArrangement=Arrangement.spacedBy(10.dp)) {
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(card?.name ?: if(b.qteActive) "QTE" else "Elige una carta",fontWeight=FontWeight.Black,style=MaterialTheme.typography.titleMedium)
                    if(emblem!=null) Text(emblem.icon+" "+emblem.name,color=Color(emblem.colorHex),style=MaterialTheme.typography.labelMedium)
                }
                if(b.qteActive) Text("%.2f s".format(b.timeRemaining),color=MaterialTheme.colorScheme.primary,fontWeight=FontWeight.Black)
            }
            if(b.qteActive) {
                Row(horizontalArrangement=Arrangement.spacedBy(5.dp)) {
                    StatPill("Prec.","%.0f%%".format(b.accuracy))
                    StatPill("PN","%.2f".format(b.netPower))
                    StatPill("✓",b.correct.toString())
                    StatPill("✕",b.incorrect.toString())
                }
                if(b.sequenceVisible) {
                    Row(
                        Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha=.45f),RoundedCornerShape(16.dp)).padding(8.dp),
                        horizontalArrangement=Arrangement.spacedBy(6.dp)
                    ) {
                        section?.buttons?.forEachIndexed { index,button ->
                            val active=index==b.buttonIndex
                            Box(
                                Modifier.size(38.dp).border(if(active)2.dp else 1.dp,if(active)MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,RoundedCornerShape(10.dp)),
                                contentAlignment=Alignment.Center
                            ){Text(button.label,fontWeight=FontWeight.Black)}
                        }
                    }
                } else {
                    Box(Modifier.fillMaxWidth().height(54.dp).background(Color.Black.copy(alpha=.55f),RoundedCornerShape(16.dp)),contentAlignment=Alignment.Center) {
                        Text("SECUENCIA OCULTA · MEMORIZA",fontWeight=FontWeight.Black,color=Color(0xFFC896FF))
                    }
                }
            } else {
                b.lastResult?.let { Text("Última ejecución: "+"%.1f".format(it.accuracy)+" % · PN "+"%.2f".format(it.netPower),color=MaterialTheme.colorScheme.onSurfaceVariant) }
            }
            QteButtonPad({vm.submitInput(it)},Modifier.fillMaxWidth(),compact=compact,enabled=b.qteActive)
        }
    }
}

@Composable
private fun HandRow(b:BattleUiState,vm:QteViewModel,modifier:Modifier=Modifier) {
    Column(modifier,verticalArrangement=Arrangement.spacedBy(5.dp)) {
        Text(if(b.winner==null)"Tu mano" else "Combate finalizado",fontWeight=FontWeight.Bold)
        if(b.winner!=null) {
            Button(onClick=vm::startBattle,modifier=Modifier.fillMaxWidth()){Text("Nueva partida")}
        } else {
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(7.dp)) {
                b.playerHand.forEach { id ->
                    val card=vm.cardById(id)
                    val emblem=EmblemCatalog.get(b.playerEmblems[id])
                    if(card!=null) HandCard(card,emblem?.icon,emblem?.colorHex,!b.qteActive){vm.chooseBattleCard(id)}
                }
                repeat((3-b.playerHand.size).coerceAtLeast(0)){Spacer(Modifier.weight(1f))}
            }
        }
    }
}

@Composable
private fun RowScope.HandCard(card:QteCard,icon:String?,colorHex:Long?,enabled:Boolean,onClick:()->Unit) {
    val color=colorHex?.let(::Color) ?: MaterialTheme.colorScheme.outline
    Surface(
        Modifier.weight(1f).heightIn(min=68.dp).border(1.dp,color.copy(alpha=.8f),RoundedCornerShape(16.dp)).clickable(enabled=enabled,onClick=onClick),
        shape=RoundedCornerShape(16.dp),color=MaterialTheme.colorScheme.surfaceVariant.copy(alpha=if(enabled).75f else .35f)
    ) {
        Column(Modifier.padding(9.dp),verticalArrangement=Arrangement.spacedBy(3.dp)) {
            Text((icon ?: "")+" "+card.name,maxLines=2,style=MaterialTheme.typography.labelMedium,fontWeight=FontWeight.Bold)
            Text("PB "+"%.2f".format(card.rawPower),style=MaterialTheme.typography.labelSmall,color=MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
