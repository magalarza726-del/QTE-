package ec.qtelab.mobile.domain

object DeckRules {
    const val MIN_CARDS = 15
    const val MAX_CARDS = 20
    const val HAND_SIZE = 3

    fun isValid(size: Int): Boolean = size in MIN_CARDS..MAX_CARDS
    fun label(size: Int): String = "$size/$MIN_CARDS–$MAX_CARDS"
}
