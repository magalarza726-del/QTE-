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
import ec.qtelab.mobile.domain.DeckRules
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
    val playerReady = DeckRules.isValid(state.playerDeck.size)
    val enemyReady = DeckRules.isValid(state.enemyDeck.size)
    val bothReady = playerReady && enemyReady

    Column(
        Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        SectionTitle(
            "PASO 2 DE 2",
            "Decks de combate",
            "Cada lado debe tener entre " + DeckRules.MIN_CARDS + " y " + DeckRules.MAX_CARDS + " cartas. Toca una carta para añadirla o retirarla."
        )

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
                selected = side == DeckSide.PLAYER,
                onClick = { side = DeckSide.PLAYER },
                label = { Text("Tu deck " + state.playerDeck.size + "/" + DeckRules.MAX_CARDS) },
                modifier = Modifier.weight(1f)
            )
            FilterChip(
                selected = side == DeckSide.ENEMY,
                onClick = { side = DeckSide.ENEMY },
                label = { Text("Rival " + state.enemyDeck.size + "/" + DeckRules.MAX_CARDS) },
                modifier = Modifier.weight(1f)
            )
        }

        Surface(shape = RoundedCornerShape(20.dp), tonalElevation = 2.dp) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(Modifier.weight(1f)) {
                        OutlinedButton(
                            onClick = { presetExpanded = true },
                            modifier = Modifier.fillMaxWidth()
                        ) { Text("Cargar preset") }
                        DropdownMenu(expanded = presetExpanded, onDismissRequest = { presetExpanded = false }) {
                            state.decks.keys.sorted().forEach { name ->
                                DropdownMenuItem(
                                    text = { Text(name, maxLines = 1) },
                                    onClick = {
                                        vm.loadDeck(name, side)
                                        presetExpanded = false
                                    }
                                )
                            }
                        }
                    }
                    AssistChip(
                        onClick = {},
                        label = { Text(deck.size.toString() + "/" + DeckRules.MAX_CARDS) }
                    )
                }

                OutlinedTextField(
                    value = saveName,
                    onValueChange = { saveName = it },
                    label = { Text("Nombre del deck") },
                    placeholder = { Text("Ej. Mi deck Sombra") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Button(
                    onClick = {
                        vm.saveCurrentDeck(saveName, side)
                        if (saveName.isNotBlank() && DeckRules.isValid(deck.size)) saveName = ""
                    },
                    enabled = DeckRules.isValid(deck.size),
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Guardar deck") }

                val ready = DeckRules.isValid(deck.size)
                Text(
                    if (ready) {
                        "Listo: " + deck.size + " cartas"
                    } else if (deck.size < DeckRules.MIN_CARDS) {
                        "Faltan " + (DeckRules.MIN_CARDS - deck.size) + " carta(s) para el mínimo."
                    } else {
                        "Máximo alcanzado."
                    },
                    fontWeight = FontWeight.Bold,
                    color = if (ready) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Button(
            onClick = vm::startBattle,
            enabled = bothReady,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                if (bothReady) "Iniciar batalla"
                else "Completa ambos decks (" + DeckRules.MIN_CARDS + "–" + DeckRules.MAX_CARDS + ")"
            )
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
