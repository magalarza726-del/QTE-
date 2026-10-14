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
import kotlin.math.PI
import kotlin.math.sin

@Composable
fun CombatStage(
    playerEmblem: String?,
    enemyEmblem: String?,
    hitPulse: Int,
    modifier: Modifier = Modifier,
    attackSide: String? = null,
    attackProgress: Float = 0f,
    attackType: String? = null,
    backgroundFile: File? = null,
    backgroundOpacity: Int = 25,
    overlayOpacity: Int = 68,
    safeMode: Boolean = true
) {
    val impact = remember { Animatable(0f) }
    LaunchedEffect(hitPulse) {
        if (hitPulse > 0) {
            impact.snapTo(1f)
            impact.animateTo(0f, tween(520))
        }
    }

    val pColor = EmblemCatalog.get(playerEmblem)?.let { Color(it.colorHex) } ?: QteCyan
    val eColor = EmblemCatalog.get(enemyEmblem)?.let { Color(it.colorHex) } ?: QtePurple
    val bitmap = remember(backgroundFile?.absolutePath, backgroundFile?.lastModified()) {
        backgroundFile?.takeIf { it.exists() }?.let { BitmapFactory.decodeFile(it.absolutePath)?.asImageBitmap() }
    }
    val bgAlpha = ((if (safeMode) backgroundOpacity.coerceAtMost(35) else backgroundOpacity).coerceIn(0, 100) / 100f)
    val veilAlpha = ((if (safeMode) overlayOpacity.coerceAtLeast(55) else overlayOpacity).coerceIn(0, 100) / 100f)

    Box(modifier.background(Color(0xFF06111C))) {
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
            val ground = size.height * .80f
            val progress = attackProgress.coerceIn(0f, 1f)
            val attackPulse = sin(progress * PI).toFloat().coerceAtLeast(0f)
            val playerAttacking = attackSide == "player"
            val enemyAttacking = attackSide == "enemy"
            val travelScale = movementScale(attackType)
            val travel = size.width * .26f * attackPulse * travelScale
            val impactKick = if (progress > .56f) {
                ((progress - .56f) / .30f).coerceIn(0f, 1f) * size.width * .055f
            } else 0f

            val basePlayer = Offset(size.width * .24f, ground)
            val baseEnemy = Offset(size.width * .76f, ground)
            val playerOrigin = Offset(
                basePlayer.x + if (playerAttacking) travel else if (enemyAttacking) -impactKick else 0f,
                basePlayer.y - jumpOffset(attackType, progress, playerAttacking)
            )
            val enemyOrigin = Offset(
                baseEnemy.x - if (enemyAttacking) travel else if (playerAttacking) -impactKick else 0f,
                baseEnemy.y - jumpOffset(attackType, progress, enemyAttacking)
            )

            drawLine(Color(0x334DE5FF), Offset(0f, ground), Offset(size.width, ground), 2f)

            if (playerAttacking || enemyAttacking) {
                val attacker = if (playerAttacking) playerOrigin else enemyOrigin
                val defender = if (playerAttacking) enemyOrigin else playerOrigin
                val color = if (playerAttacking) pColor else eColor
                drawTechniqueEffect(attacker, defender, attackType, progress, color)
            }

            drawStickman(
                origin = playerOrigin,
                facing = 1f,
                body = Color(0xFFDDF8FF),
                extremity = pColor,
                attackType = attackType,
                progress = progress,
                attacking = playerAttacking
            )
            drawStickman(
                origin = enemyOrigin,
                facing = -1f,
                body = Color(0xFFF0E6FF),
                extremity = eColor,
                attackType = attackType,
                progress = progress,
                attacking = enemyAttacking
            )

            if (impact.value > 0f) {
                val center = Offset(size.width * .5f, size.height * .52f)
                drawCircle(
                    Color.White.copy(alpha = impact.value * .78f),
                    radius = size.minDimension * .10f * impact.value,
                    center = center,
                    style = Stroke(width = 5f)
                )
                drawCircle(
                    (if (attackSide == "enemy") eColor else pColor).copy(alpha = impact.value * .58f),
                    radius = size.minDimension * .18f * impact.value,
                    center = center,
                    style = Stroke(width = 4f)
                )
            }
        }
    }
}

private fun movementScale(type: String?): Float = when (type) {
    "shot", "laser-beam", "rapid-shots", "boomerang", "energy-wave", "explosion", "shockwave" -> .14f
    "teleport" -> if (type == "teleport") 1.12f else 1f
    "dash", "charge", "lunge", "flying-kick", "meteor-dive" -> 1.15f
    else -> .72f
}

private fun jumpOffset(type: String?, progress: Float, attacking: Boolean): Float {
    if (!attacking) return 0f
    val airborne = type in setOf("jump", "flying-kick", "backflip-kick", "meteor-dive")
    return if (airborne) sin(progress * PI).toFloat().coerceAtLeast(0f) * 34f else 0f
}

private fun DrawScope.drawTechniqueEffect(
    attacker: Offset,
    defender: Offset,
    type: String?,
    progress: Float,
    color: Color
) {
    if (progress <= .12f || progress >= .96f) return
    val alpha = sin(progress * PI).toFloat().coerceIn(0f, 1f)
    when (type) {
        "shot", "laser-beam", "rapid-shots", "energy-wave", "boomerang" -> {
            val end = Offset(
                attacker.x + (defender.x - attacker.x) * progress.coerceIn(.15f, .90f),
                attacker.y - size.minDimension * .18f
            )
            drawLine(
                color.copy(alpha = .85f * alpha),
                Offset(attacker.x, attacker.y - size.minDimension * .18f),
                end,
                strokeWidth = if (type == "laser-beam") 12f else 6f,
                cap = StrokeCap.Round
            )
            drawCircle(Color.White.copy(alpha = .8f * alpha), 7f + 10f * alpha, end)
        }
        "explosion", "shockwave", "ground-slam", "hammer" -> {
            val center = Offset(defender.x, defender.y - size.minDimension * .16f)
            drawCircle(
                color.copy(alpha = .7f * alpha),
                radius = size.minDimension * (.06f + .16f * progress),
                center = center,
                style = Stroke(width = 6f)
            )
        }
        "sword-slash", "double-slash", "spear-thrust", "sweep", "spin", "whirlwind" -> {
            val center = Offset(
                attacker.x + (defender.x - attacker.x) * .35f,
                attacker.y - size.minDimension * .20f
            )
            drawCircle(
                color.copy(alpha = .60f * alpha),
                radius = size.minDimension * (.08f + .08f * alpha),
                center = center,
                style = Stroke(width = 7f)
            )
            drawLine(
                Color.White.copy(alpha = .75f * alpha),
                Offset(center.x - 34f, center.y + 24f),
                Offset(center.x + 38f, center.y - 28f),
                5f,
                StrokeCap.Round
            )
        }
        else -> {
            val start = Offset(attacker.x, attacker.y - size.minDimension * .19f)
            val end = Offset(
                start.x + (defender.x - attacker.x) * .30f,
                start.y
            )
            drawLine(color.copy(alpha = .45f * alpha), start, end, 5f, StrokeCap.Round)
        }
    }
}

private fun DrawScope.drawStickman(
    origin: Offset,
    facing: Float,
    body: Color,
    extremity: Color,
    attackType: String?,
    progress: Float,
    attacking: Boolean
) {
    val unit = size.minDimension / 18f
    val pose = if (attacking) sin(progress * PI).toFloat().coerceAtLeast(0f) else 0f
    val head = Offset(origin.x, origin.y - unit * 6.2f)
    val neck = Offset(origin.x, origin.y - unit * 5.2f)
    val hip = Offset(origin.x, origin.y - unit * 2.6f)
    val shoulderL = Offset(origin.x - unit * .7f, origin.y - unit * 4.8f)
    val shoulderR = Offset(origin.x + unit * .7f, origin.y - unit * 4.8f)

    val kickPose = attackType in setOf("kick", "flying-kick", "backflip-kick", "sweep", "knee-strike")
    val upperPose = attackType in setOf("uppercut", "hammer", "ground-slam")
    val reach = if (attacking) unit * 1.45f * pose else 0f

    val handFront = Offset(
        origin.x + facing * (unit * 2.6f + reach),
        origin.y - unit * (if (upperPose) 3.7f + 2.0f * pose else 3.7f)
    )
    val handBack = Offset(origin.x - facing * unit * 1.8f, origin.y - unit * 3.5f)
    val footFront = Offset(
        origin.x + facing * (unit * 1.7f + if (kickPose) unit * 1.9f * pose else 0f),
        origin.y - if (kickPose) unit * 2.0f * pose else 0f
    )
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
