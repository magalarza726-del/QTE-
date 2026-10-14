package ec.qtelab.mobile.domain

import ec.qtelab.mobile.data.ExecutionResult

object BalanceRules {
    const val MAX_HP = 20.0
    const val MAX_DAMAGE_PER_CARD_RATE = 0.38
    const val MAX_DAMAGE_PER_TURN_RATE = 0.58
    const val MAX_SELF_DAMAGE_PER_TURN_RATE = 0.25
    const val MAX_HEALING_PER_TURN_RATE = 0.15

    val maxDamagePerCard get() = MAX_HP * MAX_DAMAGE_PER_CARD_RATE
    val maxDamagePerTurn get() = MAX_HP * MAX_DAMAGE_PER_TURN_RATE
    val maxSelfDamagePerTurn get() = MAX_HP * MAX_SELF_DAMAGE_PER_TURN_RATE
    val maxHealingPerTurn get() = MAX_HP * MAX_HEALING_PER_TURN_RATE

    fun outgoingMultiplier(emblemId: String?, currentHp: Double): Double {
        val emblem = EmblemCatalog.get(emblemId) ?: return 1.0
        val vengeance = if (
            emblem.vengeanceThreshold != null && currentHp / MAX_HP < emblem.vengeanceThreshold
        ) emblem.vengeanceMultiplier else 1.0
        return emblem.outgoingMultiplier * vengeance
    }

    fun damage(result: ExecutionResult, emblemId: String?, attackerHp: Double, incomingMultiplier: Double = 1.0): Double {
        val raw = result.netPower * outgoingMultiplier(emblemId, attackerHp) * incomingMultiplier
        return raw.coerceIn(0.0, maxDamagePerCard)
    }

    fun selfDamage(result: ExecutionResult, emblemId: String?, perfectDamage: Double): Double {
        val emblem = EmblemCatalog.get(emblemId) ?: return 0.0
        if (!emblem.selfDamagePerError) return 0.0
        val cap = MAX_HP * emblem.selfDamageCapRate.coerceAtLeast(0.0)
        return (perfectDamage * emblem.selfDamageRatePerError * result.incorrect)
            .coerceIn(0.0, minOf(cap, maxSelfDamagePerTurn))
    }

    fun healing(effectiveDamage: Double, emblemId: String?): Double {
        val emblem = EmblemCatalog.get(emblemId) ?: return 0.0
        val cap = MAX_HP * emblem.healingCapRate.coerceAtLeast(0.0)
        return (effectiveDamage * emblem.healingRate).coerceIn(0.0, minOf(cap, maxHealingPerTurn))
    }
}
