package ec.qtelab.mobile.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ec.qtelab.mobile.data.BundledMusicCatalog
import ec.qtelab.mobile.data.PersistentState
import ec.qtelab.mobile.ui.components.SectionTitle
import ec.qtelab.mobile.viewmodel.QteViewModel

@Composable
fun MediaScreen(state: PersistentState, vm: QteViewModel) {
    val settings=state.settings
    val backgroundPicker=rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if(uri!=null) vm.importBattleBacksround(uri)
    }
    val musicPicker=rememberLauncherForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        vm.importMusicTracks(uris)
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding=PaddingValues(16.dp),
        verticalArrangement=Arrangement.spacedBy(14.dp)
    ) {
        item {
            SectionTitle(
                "MULTIMEDIA",
                "Escenario y música",
                "Todo se importa al almacenamiento privado del teléfono y funciona sin Internet."
            )
        }
        item {
            Surface(shape=RoundedCornerShape(24.dp),tonalElevation=3.dp) {
                Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
                    Row {
                        Icon(Icons.Default.PhotoLibrary,null)
                        Spacer(Modifier.width(8.dp))
                        Text("Fondo de batalla",fontWeight=FontWeight.Bold)
                    }
                    Text(
                        settings.battleBackgroundName.ifBlank { "Sin fondo personalizado" },
                        color=MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                        Button(onClick={backgroundPicker.launch("*/*")}){Text("Importar imagen/video")}
                        OutlinedButton(onClick=vm::removeBattleBackground,enabled=settings.battleBackgroundId!=null){Text("Quitar")}
                    }
                    Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween) {
                        Text("Protección de legibilidad")
                        Switch(settings.safeMode,vm::setSafeMode)
                    }
                    SettingSlider("Visibilidad del fondo",settings.backgroundOpacity,0,100,vm::setBackgroundOpacity)
                    SettingSlider("Capa oscura",settings.overlayOpacity,0,100,vm::setOverlayOpacity)
                    SettingSlider("Desenfoque",settings.backgroundBlur,0,24,vm::setBackgroundBlur)
                    if(settings.safeMode) {
                        Text(
                            "Modo seguro: durante el combate se limita el fondo para mantener el QTE legible.",
                            style=MaterialTheme.typography.bodySmall,
                            color=MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }
        item {
            Surface(shape=RoundedCornerShape(24.dp),tonalElevation=3.dp) {
                Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
                    Row {
                        Icon(Icons.Default.LibraryMusic,null)
                        Spacer(Modifier.width(8.dp))
                        Text("Biblioteca de música",fontWeight=FontWeight.Bold)
                    }
                    val customCount = settings.musicTracks.count { !BundledMusicCatalog.isBundled(it) }
                    Text(
                        "6 pistas incluidas · " + customCount + "/20 personalizadas",
                        color=MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Button(
                        onClick={musicPicker.launch(arrayOf("audio/*"))},
                        enabled=customCount<20
                    ) {
                        Text("Importar pistas")
                    }
                    Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween) {
                        Text("Pista aleatoria por combate")
                        Switch(settings.randomMusic,vm::setRandomMusic)
                    }
                    SettingSlider("Volumen",settings.musicVolume,0,100,vm::setMusicVolume)
                    if(settings.musicTracks.isEmpty()) {
                        Text("No hay pistas importadas.",color=MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        settings.musicTracks.forEach { id ->
                            val meta=vm.mediaMeta(id)
                            val selected=settings.selectedMusicId==id
                            val bundled=BundledMusicCatalog.isBundled(id)
                            Surface(
                                shape=RoundedCornerShape(16.dp),
                                color=if(selected)MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
                            ) {
                                Row(Modifier.fillMaxWidth().padding(10.dp)) {
                                    Column(Modifier.weight(1f)) {
                                        Text(meta?.name ?: "Audio",fontWeight=FontWeight.Bold,maxLines=1)
                                        Text(
                                            if(bundled) "Incluida · disponible sin Internet" else (meta?.type ?: "Audio importado"),
                                            style=MaterialTheme.typography.labelSmall,
                                            color=if(bundled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    if(!settings.randomMusic) {
                                        RadioButton(selected,onClick={vm.selectMusicTrack(id)})
                                    }
                                    if(!bundled) {
                                        IconButton(onClick={vm.removeMusicTrack(id)}) {
                                            Icon(Icons.Default.Delete,"Eliminar pista")
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        item { Spacer(Modifier.height(80.dp)) }
    }
}

@Composable
private fun SettingSlider(label:String,value:Int,min:Int,max:Int,onChange:(Int)->Unit) {
    Column(verticalArrangement=Arrangement.spacedBy(3.dp)) {
        Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween) {
            Text(label)
            Text(value.toString())
        }
        Slider(
            value=value.toFloat(),
            onValueChange={onChange(it.toInt())},
            valueRange=min.toFloat()..max.toFloat()
        )
    }
}
