package ec.qtelab.mobile

import android.view.KeyEvent
import ec.qtelab.mobile.data.QteButton

object QteHardwareInput {
    var handler: ((QteButton) -> Boolean)? = null

    fun fromKeyCode(keyCode: Int): QteButton? = when (keyCode) {
        KeyEvent.KEYCODE_DPAD_UP -> QteButton.UP
        KeyEvent.KEYCODE_DPAD_DOWN -> QteButton.DOWN
        KeyEvent.KEYCODE_DPAD_LEFT -> QteButton.LEFT
        KeyEvent.KEYCODE_DPAD_RIGHT -> QteButton.RIGHT
        KeyEvent.KEYCODE_BUTTON_A -> QteButton.A
        KeyEvent.KEYCODE_BUTTON_B -> QteButton.B
        KeyEvent.KEYCODE_BUTTON_X -> QteButton.X
        KeyEvent.KEYCODE_BUTTON_Y -> QteButton.Y
        KeyEvent.KEYCODE_BUTTON_L1 -> QteButton.L1
        KeyEvent.KEYCODE_BUTTON_R1 -> QteButton.R1
        KeyEvent.KEYCODE_BUTTON_L2 -> QteButton.L2
        KeyEvent.KEYCODE_BUTTON_R2 -> QteButton.R2
        else -> null
    }
}
