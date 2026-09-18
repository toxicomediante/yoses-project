package com.yose.project.widgets

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.Action
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.clickable
import androidx.glance.action.actionStartActivity
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.background
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.yose.project.MainActivity
import com.yose.project.R
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

private val Acid = ColorProvider(Color(0xFFD2FF1A))
private val White = ColorProvider(Color(0xFFF0F3ED))
private val Muted = ColorProvider(Color(0xFF929C93))
private val Dim = ColorProvider(Color(0xFF626B63))
private val Background = ColorProvider(Color(0xFF050706))
private val Panel = ColorProvider(Color(0xFF101411))

private val RouteKey = ActionParameters.Key<String>("widget_route")
private val StartKey = ActionParameters.Key<Boolean>("widget_start")

private fun routeAction(route: String, start: Boolean = false): Action =
    actionStartActivity<MainActivity>(
        actionParametersOf(RouteKey to route, StartKey to start)
    )

private object WidgetStore {
    fun root(context: Context): JSONObject {
        val raw = context.getSharedPreferences("yoses_widgets", Context.MODE_PRIVATE)
            .getString("snapshot", "{}") ?: "{}"
        return try { JSONObject(raw) } catch (_: Exception) { JSONObject() }
    }

    fun todayKey(): String = dateKey(Calendar.getInstance())

    fun dateKey(calendar: Calendar): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.US).format(calendar.time)

    fun shortToday(): String {
        val c = Calendar.getInstance()
        val days = arrayOf("DOM","LUN","MAR","MIÉ","JUE","VIE","SÁB")
        return "${days[c.get(Calendar.DAY_OF_WEEK) - 1]} ${c.get(Calendar.DAY_OF_MONTH)}"
    }

    fun entries(root: JSONObject): JSONArray = root.optJSONArray("entries") ?: JSONArray()

    fun entry(root: JSONObject, key: String): JSONObject? {
        val entries = entries(root)
        for (i in 0 until entries.length()) {
            val item = entries.optJSONObject(i) ?: continue
            if (item.optString("date") == key) return item
        }
        return null
    }

    fun weekKeys(): List<String> {
        val c = Calendar.getInstance()
        val offset = (c.get(Calendar.DAY_OF_WEEK) + 5) % 7
        c.add(Calendar.DAY_OF_MONTH, -offset)
        return (0..6).map {
            val key = dateKey(c)
            c.add(Calendar.DAY_OF_MONTH, 1)
            key
        }
    }

    fun settings(root: JSONObject): JSONObject = root.optJSONObject("settings") ?: JSONObject()
    fun timer(root: JSONObject): JSONObject = root.optJSONObject("timer") ?: JSONObject()
    fun strengthDraft(root: JSONObject): JSONArray = root.optJSONArray("strengthDraft") ?: JSONArray()

    fun hasAlcoholValue(entry: JSONObject?): Boolean =
        entry != null && entry.has("alcohol") && !entry.isNull("alcohol")

    fun alcohol(entry: JSONObject?): String =
        if (hasAlcoholValue(entry)) entry?.optString("alcohol", "") ?: "" else ""

    fun trained(entry: JSONObject?): Boolean = entry?.optBoolean("trained", false) ?: false

    fun weight(entry: JSONObject?): Double? {
        if (entry == null || !entry.has("weightKg") || entry.isNull("weightKg")) return null
        return entry.optDouble("weightKg").takeIf { !it.isNaN() }
    }
}

@Composable
private fun RitualFrame(route: String, content: @Composable () -> Unit) {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(Background)
            .cornerRadius(22.dp)
            .clickable(routeAction(route)),
        contentAlignment = Alignment.Center
    ) {
        Image(
            provider = ImageProvider(R.drawable.widget_moon),
            contentDescription = null,
            modifier = GlanceModifier.size(150.dp)
        )
        Column(
            modifier = GlanceModifier.fillMaxSize().padding(14.dp),
            verticalAlignment = Alignment.Top,
            horizontalAlignment = Alignment.Start
        ) {
            content()
        }
    }
}

@Composable
private fun BrandRow(title: String, right: String = "") {
    Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(
            text = title,
            style = TextStyle(color = Acid, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        )
        Spacer(GlanceModifier.width(10.dp))
        Text(
            text = right,
            style = TextStyle(color = Muted, fontSize = 9.sp, fontWeight = FontWeight.Medium)
        )
    }
}

@Composable
private fun StatusCell(label: String, value: String, active: Boolean) {
    Column(
        modifier = GlanceModifier
            .background(Panel)
            .cornerRadius(12.dp)
            .padding(9.dp)
    ) {
        Text(label, style = TextStyle(color = Muted, fontSize = 8.sp, fontWeight = FontWeight.Medium))
        Spacer(GlanceModifier.height(4.dp))
        Text(
            value,
            style = TextStyle(
                color = if (active) Acid else White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
        )
    }
}

class TodayWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val root = WidgetStore.root(context)
        val today = WidgetStore.entry(root, WidgetStore.todayKey())
        val alcohol = WidgetStore.alcohol(today)
        val trained = WidgetStore.trained(today)
        val weight = WidgetStore.weight(today)

        provideContent {
            RitualFrame("today") {
                BrandRow("HOY", WidgetStore.shortToday())
                Spacer(GlanceModifier.height(12.dp))
                Row(modifier = GlanceModifier.fillMaxWidth()) {
                    StatusCell(
                        "ALCOHOL",
                        when (alcohol) {
                            "none" -> "SIN"
                            "alcohol" -> "SÍ"
                            else -> "—"
                        },
                        alcohol == "none"
                    )
                    Spacer(GlanceModifier.width(8.dp))
                    StatusCell("ENTRENO", if (trained) "HECHO" else "—", trained)
                }
                Spacer(GlanceModifier.height(10.dp))
                Text(
                    text = if (weight != null) "PESO · ${String.format(Locale.US, "%.1f", weight)} KG" else "TOCA PARA REGISTRAR EL DÍA",
                    style = TextStyle(color = if (weight != null) White else Dim, fontSize = 8.sp, fontWeight = FontWeight.Medium)
                )
            }
        }
    }
}

class TodayWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TodayWidget()
}

class WeekWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val root = WidgetStore.root(context)
        val keys = WidgetStore.weekKeys()
        val entries = keys.map { WidgetStore.entry(root, it) }
        val registered = entries.count { WidgetStore.hasAlcoholValue(it) }
        val noAlcohol = entries.count { WidgetStore.alcohol(it) == "none" }
        val trained = entries.count { WidgetStore.trained(it) }
        val goal = WidgetStore.settings(root).optInt("weeklyTrainingGoal", 3).coerceIn(1, 7)
        val dayNames = listOf("L","M","X","J","V","S","D")

        provideContent {
            RitualFrame("week") {
                BrandRow("ESTA SEMANA", "OBJETIVO · ${goal} ENTRENOS")
                Spacer(GlanceModifier.height(10.dp))
                Row(modifier = GlanceModifier.fillMaxWidth()) {
                    StatusCell("ENTRENO", "${trained} / ${goal}", trained >= goal)
                    Spacer(GlanceModifier.width(8.dp))
                    StatusCell("SIN ALCOHOL", "${noAlcohol} / ${registered}", registered > 0 && noAlcohol == registered)
                }
                Spacer(GlanceModifier.height(10.dp))
                Row(modifier = GlanceModifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                    dayNames.forEachIndexed { index, name ->
                        val e = entries[index]
                        val good = WidgetStore.alcohol(e) == "none" || WidgetStore.trained(e)
                        Text(
                            text = if (good) "●\n$name" else "○\n$name",
                            modifier = GlanceModifier.padding(horizontal = 5.dp),
                            style = TextStyle(
                                color = if (good) Acid else Dim,
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center
                            )
                        )
                    }
                }
            }
        }
    }
}

class WeekWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = WeekWidget()
}

class StrengthWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val root = WidgetStore.root(context)
        var exercises = WidgetStore.strengthDraft(root)
        if (exercises.length() == 0) {
            exercises = WidgetStore.entry(root, WidgetStore.todayKey())?.optJSONArray("exercises") ?: JSONArray()
        }
        val first = exercises.optJSONObject(0)
        val name = first?.optString("name", "")?.takeIf { it.isNotBlank() }
        val load = if (first != null && first.has("loadKg") && !first.isNull("loadKg")) first.optDouble("loadKg") else null
        val sets = first?.optJSONArray("sets") ?: JSONArray()
        val reps = (0 until sets.length()).mapNotNull { i ->
            val s = sets.optJSONObject(i) ?: return@mapNotNull null
            if (!s.has("reps") || s.isNull("reps")) null else s.optInt("reps")
        }
        val repText = if (reps.isEmpty()) "SIN SERIES TODAVÍA" else reps.joinToString(" · ")

        provideContent {
            RitualFrame("strength") {
                BrandRow("FUERZA", WidgetStore.shortToday())
                Spacer(GlanceModifier.height(10.dp))
                if (name == null) {
                    Text("INICIAR ENTRENAMIENTO", style = TextStyle(color = White, fontSize = 16.sp, fontWeight = FontWeight.Bold))
                    Spacer(GlanceModifier.height(6.dp))
                    Text("TOCA PARA ABRIR EL REGISTRO DE FUERZA", style = TextStyle(color = Muted, fontSize = 8.sp))
                } else {
                    Text(name.uppercase(), style = TextStyle(color = White, fontSize = 15.sp, fontWeight = FontWeight.Bold))
                    Spacer(GlanceModifier.height(7.dp))
                    Text(
                        if (load != null && !load.isNaN()) "${String.format(Locale.US, "%.1f", load)} KG" else "CARGA —",
                        style = TextStyle(color = Acid, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    )
                    Spacer(GlanceModifier.height(5.dp))
                    Text(repText, style = TextStyle(color = White, fontSize = 11.sp, fontWeight = FontWeight.Medium))
                    Spacer(GlanceModifier.height(5.dp))
                    Text("${reps.size} SERIES · ${reps.sum()} REP", style = TextStyle(color = Muted, fontSize = 8.sp))
                }
            }
        }
    }
}

class StrengthWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = StrengthWidget()
}

class TimerWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val timer = WidgetStore.timer(WidgetStore.root(context))
        val work = timer.optInt("workSec", 60)
        val rest = timer.optInt("restSec", 180)
        val rounds = timer.optInt("rounds", 5)

        provideContent {
            Box(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(Background)
                    .cornerRadius(22.dp)
                    .padding(12.dp),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    provider = ImageProvider(R.drawable.widget_moon),
                    contentDescription = null,
                    modifier = GlanceModifier.size(92.dp)
                )
                Row(
                    modifier = GlanceModifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Column {
                        Text("INTERVALÓMETRO", style = TextStyle(color = Muted, fontSize = 7.sp, fontWeight = FontWeight.Bold))
                        Text("${work} / ${rest}", style = TextStyle(color = White, fontSize = 20.sp, fontWeight = FontWeight.Bold))
                        Text("${rounds} RONDAS", style = TextStyle(color = Acid, fontSize = 8.sp, fontWeight = FontWeight.Bold))
                    }
                    Spacer(GlanceModifier.width(14.dp))
                    Text(
                        "INICIAR ▶",
                        modifier = GlanceModifier
                            .background(Panel)
                            .cornerRadius(11.dp)
                            .padding(horizontal = 12.dp, vertical = 10.dp)
                            .clickable(routeAction("timer", true)),
                        style = TextStyle(color = Acid, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    )
                }
            }
        }
    }
}

class TimerWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TimerWidget()
}
