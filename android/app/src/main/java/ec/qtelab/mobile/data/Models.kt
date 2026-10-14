package ec.qtelab.mobile.data

import java.util.UUID

enum class QteButton(val id: String, val label: String) {
    UP("UP", "↑"), DOWN("DOWN", "↓"), LEFT("LEFT", "←"), RIGHT("RIGHT", "→"),
    A("A", "A"), B("B", "B"), X("X", "X"), Y("Y", "Y"),
    L1("L1", "L1"), R1("R1", "R1"), L2("L2", "L2"), R2("R2", "R2");

    companion object {
        fun fromId(value: String?): QteButton? = entries.firstOrNull { it.id == value?.uppercase() }
    }
}

data class QteSection(
    val id: String = UUID.randomUUID().toString(),
    val name: String = "Sección",
    val timeLimit: Double = 2.0,
    val buttons: List<QteButton> = emptyList()
)

data class AnimationStep(
    val id: String = UUID.randomUUID().toString(),
    val type: String = "straight-punch",
    val speed: Double = 1.0,
    val distance: Double = 150.0,
    val impacts: Int = 1,
    val duration: Double = 0.82,
    val jumpHeight: Double = 70.0,
    val effectSize: Double = 1.0,
    val trailLength: Double = 0.72,
    val cameraShake: Double = 0.55,
    val sound: String = "impact",
    val pauseAfter: Double = 0.08
)

data class AnimationConfig(
    val mode: String = "single",
    val name: String = "",
    val type: String = "straight-punch",
    val speed: Double = 1.0,
    val distance: Double = 150.0,
    val impacts: Int = 1,
    val duration: Double = 0.82,
    val jumpHeight: Double = 70.0,
    val effectSize: Double = 1.0,
    val trailLength: Double = 0.72,
    val cameraShake: Double = 0.55,
    val sound: String = "impact",
    val pauseAfter: Double = 0.08,
    val sequence: List<AnimationStep> = emptyList()
)

data class CardStats(
    val uses: Int = 0,
    val wins: Int = 0,
    val losses: Int = 0,
    val averageDamage: Double = 0.0,
    val averageTime: Double = 0.0,
    val averageAccuracy: Double = 0.0,
    val bestNetPower: Double = 0.0,
    val bestPerfectStreak: Int = 0,
    val currentPerfectStreak: Int = 0
)

data class QteCard(
    val id: String = "card-" + UUID.randomUUID(),
    val name: String = "Nueva carta",
    val sections: List<QteSection> = listOf(QteSection(name = "Apertura", timeLimit = 2.0)),
    val imageId: String? = null,
    val animation: AnimationConfig = AnimationConfig(),
    val stats: CardStats = CardStats(),
    val rawPower: Double = 0.0,
    val variationCoefficient: Double = 0.0
)

enum class Difficulty(val label: String) {
    EASY("Fácil"), NORMAL("Normal"), HARD("Difícil");

    companion object {
        fun fromLabel(value: String?): Difficulty = entries.firstOrNull { it.label == value } ?: NORMAL
    }
}

data class AppSettings(
    val difficulty: Difficulty = Difficulty.NORMAL,
    val musicVolume: Int = 35,
    val safeMode: Boolean = true,
    val playerEmblems: List<String> = listOf("shadow"),
    val enemyEmblems: List<String> = listOf("assassin"),
    val battleBackgroundId: String? = null,
    val battleBackgroundType: String = "",
    val battleBackgroundName: String = "",
    val backgroundOpacity: Int = 25,
    val overlayOpacity: Int = 68,
    val backgroundBlur: Int = 2,
    val musicTracks: List<String> = emptyList(),
    val selectedMusicId: String? = null,
    val lastMusicId: String? = null,
    val randomMusic: Boolean = true
)

data class EnchantmentManifest(
    val player: Map<Int, String> = emptyMap(),
    val enemy: Map<Int, String> = emptyMap()
)

data class PersistentState(
    val schemaVersion: Int = 3,
    val cards: List<QteCard> = emptyList(),
    val decks: Map<String, List<String>> = emptyMap(),
    val playerDeck: List<String> = emptyList(),
    val enemyDeck: List<String> = emptyList(),
    val settings: AppSettings = AppSettings(),
    val enchantments: EnchantmentManifest = EnchantmentManifest()
)

data class MediaMeta(
    val id: String,
    val name: String,
    val type: String,
    val createdAt: Long = System.currentTimeMillis()
)

data class ExecutionResult(
    val correct: Int,
    val incorrect: Int,
    val missed: Int,
    val total: Int,
    val realTime: Double,
    val timeLimit: Double,
    val accuracy: Double,
    val coefficient: Double,
    val netPower: Double,
    val damage: Double,
    val reason: String
)
