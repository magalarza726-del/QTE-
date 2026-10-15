@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package ec.qtelab.mobile.ui

import android.content.res.Configuration
import android.media.MediaPlayer
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import ec.qtelab.mobile.QteHardwareInput
import ec.qtelab.mobile.ui.screens.*
import ec.qtelab.mobile.viewmodel.AppScreen
import ec.qtelab.mobile.viewmodel.QteViewModel

private data class NavItem(val screen: AppScreen, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)
private val primaryNavItems = listOf(
    NavItem(AppScreen.HOME, "Inicio", Icons.Default.Home),
    NavItem(AppScreen.CARDS, "Cartas", Icons.Default.Style),
    NavItem(AppScreen.EMBLEMS, "Emblemas", Icons.Default.AutoAwesome),
    NavItem(AppScreen.DECKS, "Decks", Icons.Default.ViewCarousel),
    NavItem(AppScreen.BATTLE, "Batalla", Icons.Default.SportsMma)
)
private val secondaryNavItems = listOf(
    NavItem(AppScreen.MEDIA, "Multimedia", Icons.Default.PhotoLibrary),
    NavItem(AppScreen.DATA, "Datos", Icons.Default.SettingsBackupRestore)
)
private val allNavItems = primaryNavItems + secondaryNavItems

@Composable
fun QteApp(viewModel: QteViewModel = viewModel()) {
    val ui by viewModel.ui.collectAsStateWithLifecycle()
    val configuration = androidx.compose.ui.platform.LocalConfiguration.current
    val wide = configuration.orientation == Configuration.ORIENTATION_LANDSCAPE || configuration.screenWidthDp >= 700
    val snackbar = remember { SnackbarHostState() }
    var overflowOpen by remember { mutableStateOf(false) }

    DisposableEffect(viewModel) {
        QteHardwareInput.handler = viewModel::submitInput
        onDispose { QteHardwareInput.handler = null }
    }
    LaunchedEffect(ui.toast) {
        val message = ui.toast ?: return@LaunchedEffect
        snackbar.showSnackbar(message)
        viewModel.consumeToast()
    }

    val playBattleMusic = ui.screen == AppScreen.BATTLE && ui.battle.active && ui.battle.battleMusicId != null
    DisposableEffect(playBattleMusic, ui.battle.battleMusicId, ui.persistent.settings.musicVolume) {
        val player = if (playBattleMusic) {
            val file = viewModel.mediaFile(ui.battle.battleMusicId)
            runCatching {
                file?.takeIf { it.exists() }?.let {
                    MediaPlayer().apply {
                        setDataSource(it.absolutePath)
                        isLooping = true
                        val volume = (ui.persistent.settings.musicVolume / 100f).coerceIn(0f, 1f)
                        setVolume(volume, volume)
                        prepare()
                        start()
                    }
                }
            }.getOrNull()
        } else null
        onDispose { runCatching { player?.stop() }; player?.release() }
    }

    if (ui.loading) {
        Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) { CircularProgressIndicator() }
        return
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            if (ui.screen != AppScreen.BATTLE) {
                TopAppBar(
                    title = {
                        Column {
                            Text("QTE Lab", style = MaterialTheme.typography.titleLarge)
                            Text("Android · v0.6", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                        }
                    },
                    actions = {
                        if (!wide) {
                            Box {
                                IconButton(onClick = { overflowOpen = true }) { Icon(Icons.Default.MoreVert, "Más opciones") }
                                DropdownMenu(expanded = overflowOpen, onDismissRequest = { overflowOpen = false }) {
                                    secondaryNavItems.forEach { item ->
                                        DropdownMenuItem(
                                            text = { Text(item.label) },
                                            leadingIcon = { Icon(item.icon, null) },
                                            onClick = { overflowOpen = false; viewModel.navigate(item.screen) }
                                        )
                                    }
                                }
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
                )
            }
        },
        bottomBar = {
            if (!wide) NavigationBar {
                primaryNavItems.forEach { item ->
                    NavigationBarItem(
                        selected = ui.screen == item.screen,
                        onClick = { viewModel.navigate(item.screen) },
                        icon = { Icon(item.icon, null) },
                        label = { Text(item.label) },
                        alwaysShowLabel = false
                    )
                }
            }
        }
    ) { padding ->
        Row(Modifier.fillMaxSize().padding(padding)) {
            if (wide) {
                NavigationRail(modifier = Modifier.fillMaxHeight()) {
                    Spacer(Modifier.height(12.dp))
                    allNavItems.forEach { item ->
                        NavigationRailItem(
                            selected = ui.screen == item.screen,
                            onClick = { viewModel.navigate(item.screen) },
                            icon = { Icon(item.icon, null) },
                            label = { Text(item.label) }
                        )
                    }
                }
            }
            Box(Modifier.weight(1f).fillMaxHeight()) {
                when (ui.screen) {
                    AppScreen.HOME -> HomeScreen(ui.persistent, onCards = { viewModel.navigate(AppScreen.CARDS) }, onBattle = viewModel::beginPreparation)
                    AppScreen.CARDS -> CardsScreen(ui.persistent, viewModel)
                    AppScreen.EMBLEMS -> EmblemsScreen(ui.persistent, viewModel)
                    AppScreen.DECKS -> DecksScreen(ui.persistent, viewModel)
                    AppScreen.BATTLE -> BattleScreen(ui.persistent, ui.battle, viewModel, wide)
                    AppScreen.MEDIA -> MediaScreen(ui.persistent, viewModel)
                    AppScreen.DATA -> DataScreen(ui.persistent, viewModel)
                }
            }
        }
    }
}
