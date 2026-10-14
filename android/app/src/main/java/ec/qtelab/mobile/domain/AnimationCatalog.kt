package ec.qtelab.mobile.domain

data class AnimationDefinition(val id: String, val label: String)

object AnimationCatalog {
    val all = listOf(
        AnimationDefinition("straight-punch", "Golpe recto"),
        AnimationDefinition("dash", "Dash"),
        AnimationDefinition("kick", "Patada"),
        AnimationDefinition("uppercut", "Uppercut"),
        AnimationDefinition("spin", "Giro"),
        AnimationDefinition("sword-slash", "Espadazo"),
        AnimationDefinition("shot", "Disparo"),
        AnimationDefinition("explosion", "Explosión"),
        AnimationDefinition("charge", "Carga"),
        AnimationDefinition("jump", "Salto"),
        AnimationDefinition("combo", "Combo"),
        AnimationDefinition("hammer", "Martillazo"),
        AnimationDefinition("teleport", "Teletransporte"),
        AnimationDefinition("sweep", "Barrido"),
        AnimationDefinition("grab", "Agarre"),
        AnimationDefinition("elbow-strike", "Codazo"),
        AnimationDefinition("knee-strike", "Rodillazo"),
        AnimationDefinition("flying-kick", "Patada voladora"),
        AnimationDefinition("double-slash", "Doble corte"),
        AnimationDefinition("spear-thrust", "Estocada"),
        AnimationDefinition("boomerang", "Bumerán energético"),
        AnimationDefinition("laser-beam", "Rayo láser"),
        AnimationDefinition("shockwave", "Onda de choque"),
        AnimationDefinition("ground-slam", "Golpe al suelo"),
        AnimationDefinition("backflip-kick", "Patada con voltereta"),
        AnimationDefinition("lunge", "Embestida"),
        AnimationDefinition("meteor-dive", "Caída meteórica"),
        AnimationDefinition("whirlwind", "Torbellino"),
        AnimationDefinition("rapid-shots", "Ráfaga de disparos"),
        AnimationDefinition("energy-wave", "Corte de energía")
    )

    fun label(id: String): String = all.firstOrNull { it.id == id }?.label ?: id
}
