package ec.qtelab.mobile.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val QteCyan = Color(0xFF53E3FF)
val QtePurple = Color(0xFFB77CFF)
val QteBackground = Color(0xFF07111F)
val QteSurface = Color(0xFF0D1B2C)
val QteSurface2 = Color(0xFF12263B)
val QteDanger = Color(0xFFFF4D6D)
val QteSuccess = Color(0xFF4EE59A)

private val QteScheme = darkColorScheme(
    primary = QteCyan,
    onPrimary = Color(0xFF001E24),
    secondary = QtePurple,
    onSecondary = Color(0xFF251236),
    background = QteBackground,
    onBackground = Color(0xFFE6F5FF),
    surface = QteSurface,
    onSurface = Color(0xFFE6F5FF),
    surfaceVariant = QteSurface2,
    onSurfaceVariant = Color(0xFFB8CAD8),
    error = QteDanger,
    outline = Color(0xFF35516B)
)

@Composable
fun QteLabTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = QteScheme, content = content)
}
