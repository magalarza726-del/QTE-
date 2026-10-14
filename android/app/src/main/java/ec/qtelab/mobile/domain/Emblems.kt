package ec.qtelab.mobile.domain

import kotlin.random.Random

data class EmblemDefinition(
    val id: String,
    val name: String,
    val icon: String,
    val colorHex: Long,
    val description: String,
    val outgoingMultiplier: Double = 1.0,
    val incomingMultiplier: Double = 1.0,
    val timeMultiplier: Double = 1.0,
    val healingRate: Double = 0.0,
    val healingCapRate: Double = 0.0,
    val selfDamagePerError: Boolean = false,
    val selfDamageRatePerError: Double = 0.0,
    val selfDamageCapRate: Double = 0.0,
    val hideSequenceAfterSeconds: Double? = null,
    val extraCardOnPerfect: Boolean = false,
    val extraCardMultiplier: Double = 1.0,
    val vengeanceThreshold: Double? = null,
    val vengeanceMultiplier: Double = 1.0,
    val mirror: Boolean = false,
    val chaos: Boolean = false
)

object EmblemCatalog {
    val all = listOf(
        EmblemDefinition(
            "shadow", "Clan Sombra", "◒", 0xFF6C3A9BL,
            "Previsualiza la secuencia 3 s, luego la oculta. Un perfecto habilita una carta adicional al 65 %.",
            hideSequenceAfterSeconds = 3.0, extraCardOnPerfect = true, extraCardMultiplier = 0.65
        ),
        EmblemDefinition(
            "assassin", "Clan Asesino", "✦", 0xFFFF1744L,
            "+35 % de daño. Los errores causan autodaño limitado.",
            outgoingMultiplier = 1.35, selfDamagePerError = true,
            selfDamageRatePerError = 0.08, selfDamageCapRate = 0.25
        ),
        EmblemDefinition(
            "healer", "Clan Curandero", "✚", 0xFF36E27AL,
            "Cura 15 % del daño efectivo, con límite por turno.",
            healingRate = 0.15, healingCapRate = 0.15
        ),
        EmblemDefinition(
            "tempo", "Clan Tempo", "◷", 0xFF2196FFL,
            "+65 % de tiempo disponible y -25 % de daño.",
            outgoingMultiplier = 0.75, timeMultiplier = 1.65
        ),
        EmblemDefinition(
            "squire", "Clan Escudero", "⬡", 0xFF9AA4ADL,
            "Reduce 18 % del daño recibido.", incomingMultiplier = 0.82
        ),
        EmblemDefinition(
            "chaos", "Clan Caos", "⤨", 0xFFFF9D22L,
            "Remapea controles en dos secciones y aumenta 65 % el daño.",
            outgoingMultiplier = 1.65, chaos = true
        ),
        EmblemDefinition(
            "vengeance", "Clan Venganza", "◆", 0xFF9E1732L,
            "Por debajo de 35 % de vida obtiene +20 % de daño.",
            vengeanceThreshold = 0.35, vengeanceMultiplier = 1.20
        ),
        EmblemDefinition(
            "mirror", "Clan Espejo", "◇", 0xFFE6EDF7L,
            "Intercambia la carta elegida con la del rival.", mirror = true
        )
    )

    fun get(id: String?): EmblemDefinition? = all.firstOrNull { it.id == id }
}

object EmblemDistributor {
    fun distribute(emblemIds: List<String>, deckSize: Int = 12, random: Random = Random.Default): Map<Int, String> {
        val valid = emblemIds.distinct().filter { EmblemCatalog.get(it) != null }.take(4)
        if (valid.isEmpty()) return emptyMap()
        val positions = (0 until deckSize).shuffled(random)
        val result = mutableMapOf<Int, String>()
        positions.forEachIndexed { index, slot -> result[slot] = valid[index % valid.size] }
        return result
    }
}
