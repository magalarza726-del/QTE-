package ec.qtelab.mobile.domain

import ec.qtelab.mobile.data.QteCard
import ec.qtelab.mobile.data.QteSection
import kotlin.math.sqrt

object QteFormulas {
    fun totalButtons(card: QteCard): Int = card.sections.sumOf { it.buttons.size }
    fun totalTime(card: QteCard): Double = card.sections.sumOf { it.timeLimit.coerceAtLeast(0.0) }

    fun rawPower(card: QteCard): Double {
        val time = totalTime(card)
        return if (time > 0.0) totalButtons(card) / time else 0.0
    }

    fun variationCoefficient(card: QteCard): Double {
        val buttons = card.sections.flatMap(QteSection::buttons)
        val n = buttons.size
        if (n == 0) return 0.0
        val counts = buttons.groupingBy { it }.eachCount().values
        val sumSquares = counts.sumOf { it * it }.toDouble()
        return if (sumSquares > 0.0) sqrt((n.toDouble() * n) / sumSquares) / 10.0 else 0.0
    }

    fun netPower(correct: Int, realTime: Double, coefficient: Double): Double =
        if (realTime > 0.0) (correct / realTime) * (1.0 + coefficient) else 0.0

    fun accuracy(correct: Int, total: Int): Double =
        if (total > 0) (correct.toDouble() / total * 100.0).coerceIn(0.0, 100.0) else 0.0

    fun refresh(card: QteCard): QteCard = card.copy(
        rawPower = rawPower(card),
        variationCoefficient = variationCoefficient(card)
    )
}
