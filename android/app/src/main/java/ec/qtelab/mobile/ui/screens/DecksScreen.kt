package ec.qtelab.mobile.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ec.qtelab.mobile.data.PersistentState
import ec.qtelab.mobile.ui.components.CardTile
import ec.qtelab.mobile.ui.components.SectionTitle
import ec.qtelab.mobile.viewmodel.DeckSide
import ec.qtelab.mobile.viewmodel.QteViewModel

@Composable
fun DecksScreen(state: PersistentState, vm: QteViewModel) {
    var side by remember { mutableStateOf(DeckSide.PLAYER) }
    var presetExpanded by remember { mutableStateOf(false) }
    var saveName by remember { mutableStateOf("") }
    val deck = if (side == DeckSide.PLAYER) state.playerDeck else state.enemyDeck

    Column(Modifier.fillMaxSize().padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionTitle("CONSTRUCCIÓN", "Decks de combate", "Cada lado usa exactamente 12 cartas. Toca una carta para añadirla o retirarla.")
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(selected = side == DeckSide.PLAYER, onClick = { side = DeckSide.PLAYER }, label = { Text("Tu deck " + state.playerDeck.size + "/12") })
            FilterChip(selected = side == DeckSide.ENEMY, onClick = { side = DeckSide.ENEMY }, label = { Text("Rival " + state.enemyDeck.size + "/12") })
        }
        Surface(shape = RoundedCornerShape(20.dp), tonalElevation = 2.dp) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box {
                        OutlinedButton(onClick = { presetExpanded = true }) { Text("Cargar preset") }
                        DropdownMenu(expanded = presetExpanded, onDismissRequest = { presetExpanded = false }) {
                            state.decks.keys.sorted().forEach { name ->
                                DropdownMenuItem(text = { Text(name) }, onClick = {
                                    vm.loadDeck(name, side); presetExpanded = false
                                })
                            }
                        }
                    }
                    OutlinedTextField(
                        value = saveName, onValueChange = { saveName = it },
                        label = { Text("Nombre") }, singleLine = true, modifier = Modifier.weight(1f)
                    )
                    Button(onClick = { vm.saveCurrentDeck(saveName, side); saveName = "" }, enabled = deck.isNotEmpty()) { Text("Guardar") }
                }
                Text("Seleccionadas: " + deck.size + "/12", fontWeight = FontWeight.Bold, color = if (deck.size == 12) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        LazyVerticalGrid(
            columns = GridCells.Adaptive(170.dp),
            modifier = Modifier.weight(1f),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = PaddingValues(bottom = 92.dp)
        ) {
            items(state.cards, key = { it.id }) { card ->
                val emblem = if (side == DeckSide.PLAYER) {
                    state.playerDeck.indexOf(card.id).takeIf { it >= 0 }?.let(state.enchantments.player::get)
                } else {
                    state.enemyDeck.indexOf(card.id).takeIf { it >= 0 }?.let(state.enchantments.enemy::get)
                }
                CardTile(
                    card = card,
                    imageFile = vm.mediaFile(card.imageId),
                    emblemId = emblem,
                    selected = card.id in deck,
                    onClick = { vm.toggleDeckCard(side, card.id) }
                )
            }
        }
    }
}
