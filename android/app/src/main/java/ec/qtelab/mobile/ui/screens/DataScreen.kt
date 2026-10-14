package ec.qtelab.mobile.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material.icons.filled.FileUpload
import androidx.compose.material.icons.filled.RestartAlt
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ec.qtelab.mobile.data.PersistentState
import ec.qtelab.mobile.ui.components.SectionTitle
import ec.qtelab.mobile.viewmodel.QteViewModel

@Composable
fun DataScreen(state: PersistentState, vm: QteViewModel) {
    var confirmReset by remember { mutableStateOf(false) }
    val exportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        uri?.let(vm::writeBackup)
    }
    val importLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri?.let(vm::readBackup)
    }

    LazyColumn(
        Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item { SectionTitle("DATOS", "Importar y exportar", "El respaldo JSON puede incluir cartas, decks, emblemas, ajustes y archivos multimedia para mover tu configuración a otro teléfono.") }
        item {
            Surface(shape = RoundedCornerShape(24.dp), tonalElevation = 3.dp) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Respaldo portátil", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Compatible con la estructura de respaldo del prototipo web. Las imágenes se codifican dentro del JSON cuando existen.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Button(onClick = { exportLauncher.launch("QTE_Lab_backup.json") }, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Default.FileDownload, null); Spacer(Modifier.width(8.dp)); Text("Exportar .json")
                    }
                    FilledTonalButton(onClick = { importLauncher.launch(arrayOf("application/json", "text/json", "text/plain", "*/*")) }, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Default.FileUpload, null); Spacer(Modifier.width(8.dp)); Text("Importar .json")
                    }
                }
            }
        }
        item {
            Surface(shape = RoundedCornerShape(22.dp), color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .55f)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    Text("Estado local", fontWeight = FontWeight.Bold)
                    Text(state.cards.size.toString() + " cartas")
                    Text(state.decks.size.toString() + " decks guardados")
                    Text(state.settings.playerEmblems.size.toString() + " emblemas equipados para el jugador")
                    Text("Los datos se guardan automáticamente entre sesiones.")
                }
            }
        }
        item {
            OutlinedButton(onClick = { confirmReset = true }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)) {
                Icon(Icons.Default.RestartAlt, null); Spacer(Modifier.width(8.dp)); Text("Restaurar datos iniciales")
            }
        }
    }

    if (confirmReset) AlertDialog(
        onDismissRequest = { confirmReset = false },
        title = { Text("¿Restaurar QTE Lab?") },
        text = { Text("Se reemplazarán cartas, decks, imágenes y ajustes locales por los valores iniciales.") },
        confirmButton = { TextButton(onClick = { confirmReset = false; vm.resetAll() }) { Text("Restaurar") } },
        dismissButton = { TextButton(onClick = { confirmReset = false }) { Text("Cancelar") } }
    )
}
