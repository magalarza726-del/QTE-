package ec.qtelab.mobile.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Style
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ec.qtelab.mobile.data.PersistentState
import ec.qtelab.mobile.ui.components.SectionTitle

@Composable
fun HomeScreen(state: PersistentState, onCards: () -> Unit, onBattle: () -> Unit) {
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            SectionTitle(
                "QTE LAB MOBILE",
                "Diseña. Entrena. Combate.",
                "Versión Android nativa pensada para tocar rápido, editar sin fricción y transportar tu configuración por JSON."
            )
        }
        item {
            Surface(shape = RoundedCornerShape(28.dp), tonalElevation = 5.dp) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text("Tu laboratorio de combate", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
                    Text("El QTE representa tu habilidad mecánica; los decks y emblemas aportan la estrategia.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(onClick = onCards) { Icon(Icons.Default.Style, null); Spacer(Modifier.width(6.dp)); Text("Crear cartas") }
                        FilledTonalButton(onClick = onBattle) { Icon(Icons.Default.PlayArrow, null); Spacer(Modifier.width(6.dp)); Text("Preparar combate") }
                    }
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Metric("Cartas", state.cards.size.toString(), Modifier.weight(1f))
                Metric("Deck jugador", state.playerDeck.size.toString() + "/15–20", Modifier.weight(1f))
                Metric("Deck rival", state.enemyDeck.size.toString() + "/15–20", Modifier.weight(1f))
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Metric("Emblemas", state.settings.playerEmblems.size.toString(), Modifier.weight(1f))
                Metric("Presets", state.decks.size.toString(), Modifier.weight(1f))
                Metric("Formato", "JSON", Modifier.weight(1f))
            }
        }
        item {
            Surface(shape = RoundedCornerShape(22.dp), color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .55f)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    Text("Diseño móvil", fontWeight = FontWeight.Bold)
                    Text("• Botones QTE grandes y separados por zonas.")
                    Text("• Vertical: navegación inferior y edición apilada.")
                    Text("• Horizontal/tablet: navegación lateral y más espacio para el combate.")
                    Text("• Mando físico compatible con DPAD, ABXY y gatillos principales.")
                }
            }
        }
    }
}

@Composable
private fun Metric(label: String, value: String, modifier: Modifier = Modifier) {
    Surface(modifier, shape = RoundedCornerShape(20.dp), tonalElevation = 2.dp) {
        Column(Modifier.padding(14.dp)) {
            Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
