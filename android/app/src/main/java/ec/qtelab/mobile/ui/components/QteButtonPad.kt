package ec.qtelab.mobile.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ec.qtelab.mobile.data.QteButton
import ec.qtelab.mobile.ui.theme.QteCyan

@Composable
fun QteButtonPad(
    onPress: (QteButton) -> Unit,
    modifier: Modifier = Modifier,
    compact: Boolean = false,
    enabled: Boolean = true
) {
    val haptic = LocalHapticFeedback.current
    val size = if (compact) 44.dp else 58.dp
    val gap = if (compact) 3.dp else 8.dp
    val press: (QteButton) -> Unit = {
        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
        onPress(it)
    }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(gap)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            listOf(QteButton.L2, QteButton.L1, QteButton.R1, QteButton.R2).forEach { b ->
                PadButton(b, size, enabled, press)
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            DPad(size, gap, enabled, press)
            FacePad(size, gap, enabled, press)
        }
    }
}

@Composable
private fun DPad(size: androidx.compose.ui.unit.Dp, gap: androidx.compose.ui.unit.Dp, enabled: Boolean, press: (QteButton) -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(gap / 2)) {
        PadButton(QteButton.UP, size, enabled, press)
        Row(horizontalArrangement = Arrangement.spacedBy(gap / 2)) {
            PadButton(QteButton.LEFT, size, enabled, press)
            Spacer(Modifier.size(size))
            PadButton(QteButton.RIGHT, size, enabled, press)
        }
        PadButton(QteButton.DOWN, size, enabled, press)
    }
}

@Composable
private fun FacePad(size: androidx.compose.ui.unit.Dp, gap: androidx.compose.ui.unit.Dp, enabled: Boolean, press: (QteButton) -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(gap / 2)) {
        PadButton(QteButton.Y, size, enabled, press)
        Row(horizontalArrangement = Arrangement.spacedBy(gap / 2)) {
            PadButton(QteButton.X, size, enabled, press)
            Spacer(Modifier.size(size))
            PadButton(QteButton.B, size, enabled, press)
        }
        PadButton(QteButton.A, size, enabled, press)
    }
}

@Composable
private fun PadButton(button: QteButton, size: androidx.compose.ui.unit.Dp, enabled: Boolean, press: (QteButton) -> Unit) {
    Button(
        onClick = { press(button) }, enabled = enabled,
        modifier = Modifier.size(size),
        contentPadding = PaddingValues(0.dp),
        shape = RoundedCornerShape(if (size <= 44.dp) 13.dp else 16.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surfaceVariant,
            contentColor = QteCyan
        )
    ) {
        Text(button.label, fontWeight = FontWeight.Black, fontSize = if (button.label.length > 1) 14.sp else 21.sp)
    }
}
