package ec.qtelab.mobile

import android.os.Bundle
import android.view.KeyEvent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import ec.qtelab.mobile.ui.QteApp
import ec.qtelab.mobile.ui.theme.QteLabTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { QteLabTheme { QteApp() } }
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
            val button = QteHardwareInput.fromKeyCode(event.keyCode)
            if (button != null && QteHardwareInput.handler?.invoke(button) == true) return true
        }
        return super.dispatchKeyEvent(event)
    }
}
