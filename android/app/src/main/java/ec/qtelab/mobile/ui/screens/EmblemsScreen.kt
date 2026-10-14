package ec.qtelab.mobile.ui.screens

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ec.qtelab.mobile.data.PersistentState
import ec.qtelab.mobile.domain.EmblemCatalog
import ec.qtelab.mobile.ui.components.SectionTitle
import ec.qtelab.mobile.viewmodel.DeckSide
import ec.qtelab.mobile.viewmodel.QteViewModel

@Composable
fun EmblemsScreen(state: PersistentState, vm: QteViewModel) {
    LazyColumn(
        Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { SectionTitle("PASO 1 DE 2", "Selecciona los clanes", "Equipa entre 1 y 4 emblemas por lado. Todas las cartas del deck se reparten aleatoriamente sin repetir posición.") }
        item { EmblemSide("Jugador", state.settings.playerEmblems, DeckSide.PLAYER, vm) }
        item { EmblemSide("Rival", state.settings.enemyEmblems, DeckSide.ENEMY, vm) }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(onClick = vm::randomizeEnchantments, modifier = Modifier.weight(1f)) { Text("Volver a sortear") }
                Button(onClick = vm::continueToDecks, modifier = Modifier.weight(1f)) { Text("Continuar a decks") }
            }
        }
        item {
            Surface(shape = RoundedCornerShape(22.dp), tonalElevation = 2.dp) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    Text("Distribución actual", fontWeight = FontWeight.Bold)
                    Text("Jugador: " + state.enchantments.player.values.groupingBy { it }.eachCount().entries.joinToString { (EmblemCatalog.get(it.key)?.name?.removePrefix("Clan ") ?: it.key) + ": " + it.value })
                    Text("Rival: " + state.enchantments.enemy.values.groupingBy { it }.eachCount().entries.joinToString { (EmblemCatalog.get(it.key)?.name?.removePrefix("Clan ") ?: it.key) + ": " + it.value })
                }
            }
        }
    }
}

@Composable
private fun EmblemSide(title: String, selected: List<String>, side: DeckSide, vm: QteViewModel) {
    Surface(shape = RoundedCornerShape(24.dp), tonalElevation = 3.dp) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(selected.size.toString() + "/4", color = MaterialTheme.colorScheme.primary)
            }
            EmblemCatalog.all.chunked(2).forEach { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    row.forEach { emblem ->
                        val active = emblem.id in selected
                        val color = Color(emblem.colorHex)
                        Surface(
                            Modifier.weight(1f)
                                .border(if (active) 2.dp else 1.dp, if (active) color else MaterialTheme.colorScheme.outline, RoundedCornerShape(18.dp))
                                .clickable { vm.toggleEmblem(side, emblem.id) },
                            shape = RoundedCornerShape(18.dp),
                            color = if (active) color.copy(alpha = .14f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .45f)
                        ) {
                            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(emblem.icon + " " + emblem.name, fontWeight = FontWeight.Bold, color = if (active) color else MaterialTheme.colorScheme.onSurface)
                                Text(emblem.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                    if (row.size == 1) Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}
