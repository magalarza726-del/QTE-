package ec.qtelab.mobile.domain

import ec.qtelab.mobile.data.ExecutionResult
import ec.qtelab.mobile.data.QteButton
import ec.qtelab.mobile.data.QteCard

class QteEngine(
    private val card: QteCard,
    private val timeMultiplier: Double = 1.0,
    private val clockSeconds: () -> Double = { System.nanoTime() / 1_000_000_000.0 }
) {
    var sectionIndex: Int = 0
        private set
    var buttonIndex: Int = 0
        private set
    var correct: Int = 0
        private set
    var incorrect: Int = 0
        private set
    var missed: Int = 0
        private set
    var active: Boolean = false
        private set
    var finished: Boolean = false
        private set
    var result: ExecutionResult? = null
        private set

    private var startedAt: Double? = null
    private var sectionStartedAt: Double? = null
    private var finishedAt: Double? = null

    val currentSection get() = card.sections.getOrNull(sectionIndex)
    val expectedButton get() = currentSection?.buttons?.getOrNull(buttonIndex)
    val elapsedTime: Double get() {
        val start = startedAt ?: return 0.0
        return ((finishedAt ?: clockSeconds()) - start).coerceAtLeast(0.0)
    }
    val sectionRemaining: Double get() {
        val section = currentSection ?: return 0.0
        val started = sectionStartedAt ?: return 0.0
        return (section.timeLimit * timeMultiplier - (clockSeconds() - started)).coerceAtLeast(0.0)
    }

    fun start(): QteEngine {
        sectionIndex = 0
        buttonIndex = 0
        correct = 0
        incorrect = 0
        missed = 0
        result = null
        finished = false
        active = true
        val now = clockSeconds()
        startedAt = now
        sectionStartedAt = now
        finishedAt = null
        if (card.sections.isEmpty()) finish("sin_secuencia", now)
        return this
    }

    fun input(button: QteButton): Boolean {
        if (!active || finished) return false
        tick()
        if (finished) return false
        val expected = expectedButton ?: return false
        if (button != expected) {
            incorrect++
            return false
        }
        correct++
        buttonIndex++
        if (buttonIndex >= (currentSection?.buttons?.size ?: 0)) {
            sectionIndex++
            buttonIndex = 0
            if (sectionIndex >= card.sections.size) finish("completado")
            else sectionStartedAt = clockSeconds()
        }
        return true
    }

    fun tick() {
        if (!active || finished) return
        val now = clockSeconds()
        while (active && !finished) {
            val section = currentSection ?: run {
                finish("completado", now)
                return
            }
            val start = sectionStartedAt ?: now.also { sectionStartedAt = it }
            val deadline = start + section.timeLimit * timeMultiplier
            if (now < deadline) return
            missed += (section.buttons.size - buttonIndex).coerceAtLeast(0)
            sectionIndex++
            buttonIndex = 0
            if (sectionIndex >= card.sections.size) {
                finish("tiempo_agotado", now)
                return
            }
            sectionStartedAt = deadline
        }
    }

    fun finish(reason: String = "cancelado", now: Double = clockSeconds()): ExecutionResult {
        result?.let { return it }
        active = false
        finished = true
        finishedAt = now
        val real = elapsedTime
        val total = QteFormulas.totalButtons(card)
        val coefficient = QteFormulas.variationCoefficient(card)
        val net = QteFormulas.netPower(correct, real, coefficient)
        return ExecutionResult(
            correct = correct,
            incorrect = incorrect,
            missed = missed,
            total = total,
            realTime = real,
            timeLimit = QteFormulas.totalTime(card) * timeMultiplier,
            accuracy = QteFormulas.accuracy(correct, total),
            coefficient = coefficient,
            netPower = net,
            damage = net.coerceAtLeast(0.0),
            reason = reason
        ).also { result = it }
    }
}
