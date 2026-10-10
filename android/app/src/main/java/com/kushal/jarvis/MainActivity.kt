package com.kushal.jarvis

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val Bg = Color(0xFF050A10)
private val Cyan = Color(0xFF36E7FF)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { JarvisHome() }
    }
}

@Composable
fun JarvisHome() {
    var message by remember { mutableStateOf("") }
    var reply by remember { mutableStateOf("Your native assistant is ready for its next integration.") }

    MaterialTheme(colorScheme = darkColorScheme(
        background = Bg, surface = Color(0xFF101923),
        primary = Cyan, onBackground = Color.White
    )) {
        Column(
            Modifier.fillMaxSize().background(Bg).padding(22.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(30.dp))
            Text("J.A.R.V.I.S", color = Cyan, fontSize = 32.sp, fontWeight = FontWeight.Bold)
            Text("BY KUSHAL  •  NATIVE ANDROID", color = Color.LightGray, fontSize = 12.sp)
            Spacer(Modifier.height(28.dp))
            Surface(
                color = Color(0xFF101923),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(20.dp)) {
                    Text("SYSTEM STATUS", color = Cyan, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Text("● APP ONLINE", color = Color(0xFF69F0AE))
                    Text("Native Kotlin + Jetpack Compose", color = Color.LightGray, fontSize = 13.sp)
                }
            }
            Spacer(Modifier.height(22.dp))
            Text("How can I help?", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = message,
                onValueChange = { message = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Type a message") },
                shape = RoundedCornerShape(14.dp)
            )
            Spacer(Modifier.height(10.dp))
            Button(
                onClick = {
                    reply = if (message.isBlank()) "Type something first."
                    else "Message received: $message\nAI backend connection is the next step."
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp)
            ) { Text("SEND MESSAGE") }
            Spacer(Modifier.height(18.dp))
            Text(reply, color = Color(0xFFB8C8D8), fontSize = 14.sp)
            Spacer(Modifier.weight(1f))
            Text("JARVIS BY KUSHAL  •  V1", color = Color.Gray, fontSize = 11.sp)
        }
    }
}
