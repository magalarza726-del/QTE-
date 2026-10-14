package ec.qtelab.mobile.ui.components

import android.graphics.BitmapFactory
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import ec.qtelab.mobile.domain.EmblemCatalog
import ec.qtelab.mobile.ui.theme.QteCyan
import ec.qtelab.mobile.ui.theme.QtePurple
import java.io.File

@Composable
fun CombatStage(
    playerEmblem: String?,
    enemyEmblem: String?,
    hitPulse: Int,
    modifier: Modifier = Modifier,
    backgroundFile: File? = null,
    backgroundOpacity: Int = 25,
    overlayOpacity: Int = 68,
    safeMode: Boolean = true
) {
    val impact = remember { Animatable(0f) }
    LaunchedEffect(hitPulse) {
        if (hitPulse > 0) {
            impact.snapTo(1f)
            impact.animateTo(0f, tween(420))
        }
    }
    val pColor = EmblemCatalog.get(playerEmblem)?.let { Color(it.colorHex) } ?: QteCyan
    val eColor = EmblemCatalog.get(enemyEmblem)?.let { Color(it.colorHex) } ?: QtePurple
    val bitmap = remember(backgroundFile?.absolutePath, backgroundFile?.lastModified()) {
        backgroundFile?.takeIf { it.exists() }?.let { BitmapFactory.decodeFile(it.absolutePath)?.asImageBitmap() }
    }
    val bgAlpha = ((if (safeMode) backgroundOpacity.coerceAtMost(35) else backgroundOpacity).coerceIn(0, 100) / 100f)
    val veilAlpha = ((if (safeMode) overlayOpacity.coerceAtLeast(55) else overlayOpacity).coerceIn(0, 100) / 100f)

    Box(modifier.background(Color(0xFF081522))) {
        if (bitmap != null) {
            Image(
                bitmap = bitmap,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
                alpha = bgAlpha
            )
        }
        Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = veilAlpha)))
        Canvas(Modifier.fillMaxSize()) {
            val ground = size.height * .78f
            drawLine(Color(0x334DE5FF), Offset(0f, ground), Offset(size.width, ground), 2f)
            val push = impact.value * size.width * .025f
            drawStickman(Offset(size.width * .25f - push, ground), 1f, Color(0xFFDDF8FF), pColor)
            drawStickman(Offset(size.width * .75f + push, ground), -1f, Color(0xFFF0E6FF), eColor)
            if (impact.value > 0f) {
                val center = Offset(size.width * .5f, size.height * .52f)
                drawCircle(Color.White.copy(alpha = impact.value * .75f), radius = size.minDimension * .12f * impact.value, center = center, style = Stroke(width = 4f))
                drawCircle(QteCyan.copy(alpha = impact.value * .45f), radius = size.minDimension * .19f * impact.value, center = center, style = Stroke(width = 3f))
            }
        }
    }
}

private fun DrawScope.drawStickman(origin: Offset, facing: Float, body: Color, extremity: Color) {
    val unit = size.minDimension / 18f
    val head = Offset(origin.x, origin.y - unit * 6.2f)
    val neck = Offset(origin.x, origin.y - unit * 5.2f)
    val hip = Offset(origin.x, origin.y - unit * 2.6f)
    val shoulderL = Offset(origin.x - unit * .7f, origin.y - unit * 4.8f)
    val shoulderR = Offset(origin.x + unit * .7f, origin.y - unit * 4.8f)
    val handFront = Offset(origin.x + facing * unit * 2.6f, origin.y - unit * 3.7f)
    val handBack = Offset(origin.x - facing * unit * 1.8f, origin.y - unit * 3.5f)
    val footFront = Offset(origin.x + facing * unit * 1.7f, origin.y)
    val footBack = Offset(origin.x - facing * unit * 1.25f, origin.y)
    drawCircle(body, unit * .7f, head, style = Stroke(unit * .38f))
    drawLine(body, neck, hip, unit * .48f, cap = StrokeCap.Round)
    drawLine(body, if (facing > 0) shoulderR else shoulderL, handFront, unit * .46f, cap = StrokeCap.Round)
    drawLine(body, if (facing > 0) shoulderL else shoulderR, handBack, unit * .46f, cap = StrokeCap.Round)
    drawLine(body, hip, footFront, unit * .5f, cap = StrokeCap.Round)
    drawLine(body, hip, footBack, unit * .5f, cap = StrokeCap.Round)
    drawCircle(extremity, unit * .42f, handFront)
    drawCircle(extremity, unit * .42f, handBack)
    drawCircle(extremity, unit * .45f, footFront)
    drawCircle(extremity, unit * .45f, footBack)
}
