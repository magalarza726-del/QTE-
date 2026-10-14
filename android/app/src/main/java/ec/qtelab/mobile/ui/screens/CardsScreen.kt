package ec.qtelab.mobile.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Image
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import ec.qtelab.mobile.data.*
import ec.qtelab.mobile.domain.AnimationCatalog
import ec.qtelab.mobile.domain.QteFormulas
import ec.qtelab.mobile.ui.components.CardTile
import ec.qtelab.mobile.ui.components.QteButtonPad
import ec.qtelab.mobile.ui.components.SectionTitle
import ec.qtelab.mobile.viewmodel.QteViewModel
import java.util.UUID

@Composable
fun CardsScreen(state: PersistentState, vm: QteViewModel) {
    var query by remember { mutableStateOf("") }
    var editing by remember { mutableStateOf<QteCard?>(null) }
    var imageTarget by remember { mutableStateOf<String?>(null) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        val id=imageTarget
        if(uri!=null && id!=null) vm.attachImage(id,uri)
        imageTarget=null
    }
    val filtered=remember(state.cards,query){ state.cards.filter { it.name.contains(query,true) } }

    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement=Arrangement.spacedBy(12.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment=Alignment.CenterVertically) {
            SectionTitle("EDITOR","Biblioteca de cartas","Crea y ajusta tus QTE desde el teléfono.",Modifier.weight(1f))
            FilledIconButton(onClick={
                editing=QteCard(
                    id="card-"+UUID.randomUUID(),
                    name="Nueva carta",
                    sections=listOf(QteSection(name="Apertura",timeLimit=2.0))
                )
            }) { Icon(Icons.Default.Add,"Nueva carta") }
        }
        OutlinedTextField(query,{query=it},Modifier.fillMaxWidth(),singleLine=true,label={Text("Buscar")})
        LazyVerticalGrid(
            columns=GridCells.Adaptive(170.dp),
            modifier=Modifier.weight(1f),
            horizontalArrangement=Arrangement.spacedBy(10.dp),
            verticalArrangement=Arrangement.spacedBy(10.dp),
            contentPadding=PaddingValues(bottom=90.dp)
        ) {
            items(filtered,key={it.id}) { card ->
                Column {
                    CardTile(card,vm.mediaFile(card.imageId),onClick={editing=card})
                    Row(Modifier.fillMaxWidth()) {
                        TextButton(onClick={imageTarget=card.id;picker.launch("image/*")},modifier=Modifier.weight(1f)) {
                            Icon(Icons.Default.Image,null); Spacer(Modifier.width(4.dp)); Text("Imagen")
                        }
                        IconButton(onClick={vm.deleteCard(card.id)}) { Icon(Icons.Default.Delete,"Eliminar",tint=MaterialTheme.colorScheme.error) }
                    }
                }
            }
        }
    }

    editing?.let { card ->
        CardEditor(card,onDismiss={editing=null}) {
            vm.saveCard(it)
            editing=null
        }
    }
}

@Composable
private fun CardEditor(initial: QteCard,onDismiss:()->Unit,onSave:(QteCard)->Unit) {
    var draft by remember(initial.id){ mutableStateOf(initial) }
    var activeSection by remember { mutableIntStateOf(0) }
    var tab by remember { mutableIntStateOf(0) }
    Dialog(onDismissRequest=onDismiss,properties=DialogProperties(usePlatformDefaultWidth=false)) {
        Surface(Modifier.fillMaxSize(),color=MaterialTheme.colorScheme.background) {
            Column(Modifier.fillMaxSize()) {
                Row(Modifier.fillMaxWidth().padding(14.dp),verticalAlignment=Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Editor de carta",style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Black)
                        Text(draft.name,color=MaterialTheme.colorScheme.primary)
                    }
                    TextButton(onClick=onDismiss){Text("Cancelar")}
                    Button(onClick={onSave(QteFormulas.refresh(draft))}){Text("Guardar")}
                }
                TabRow(tab) {
                    listOf("Mecánicas","Animación","Estadísticas").forEachIndexed { i,label ->
                        Tab(selected=tab==i,onClick={tab=i},text={Text(label)})
                    }
                }
                when(tab) {
                    0 -> Mechanics(draft,activeSection,{activeSection=it}){draft=it}
                    1 -> AnimationPanel(draft){draft=it}
                    else -> StatsPanel(draft)
                }
            }
        }
    }
}

@Composable
private fun Mechanics(card:QteCard,active:Int,onActive:(Int)->Unit,onChange:(QteCard)->Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
        OutlinedTextField(card.name,{onChange(card.copy(name=it))},Modifier.fillMaxWidth(),label={Text("Nombre")},singleLine=true)
        Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
            AssistChip({},label={Text("PB %.2f".format(QteFormulas.rawPower(card)))})
            AssistChip({},label={Text("CV %.3f".format(QteFormulas.variationCoefficient(card)))})
            AssistChip({},label={Text(QteFormulas.totalButtons(card).toString()+" botones")})
        }
        card.sections.forEachIndexed { index,section ->
            ElevatedCard(onClick={onActive(index)},modifier=Modifier.fillMaxWidth()) {
                Column(Modifier.padding(12.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {
                    Row(verticalAlignment=Alignment.CenterVertically) {
                        OutlinedTextField(section.name,{name->
                            val list=card.sections.toMutableList(); list[index]=section.copy(name=name); onChange(card.copy(sections=list))
                        },Modifier.weight(1f),label={Text("Sección "+(index+1))},singleLine=true)
                        Spacer(Modifier.width(8.dp))
                        OutlinedTextField("%.2f".format(section.timeLimit),{raw->
                            raw.replace(',','.').toDoubleOrNull()?.let { value ->
                                val list=card.sections.toMutableList(); list[index]=section.copy(timeLimit=value.coerceIn(.3,30.0)); onChange(card.copy(sections=list))
                            }
                        },Modifier.width(92.dp),label={Text("seg")},singleLine=true)
                        if(card.sections.size>1) IconButton(onClick={
                            onChange(card.copy(sections=card.sections.filterIndexed{i,_->i!=index}))
                            onActive((active-1).coerceAtLeast(0))
                        }) { Icon(Icons.Default.Delete,"Eliminar sección") }
                    }
                    if(section.buttons.isEmpty()) Text("Sin botones",color=MaterialTheme.colorScheme.onSurfaceVariant)
                    else Text(section.buttons.joinToString("  "){it.label},fontWeight=FontWeight.Bold)
                }
            }
        }
        OutlinedButton(onClick={
            onChange(card.copy(sections=card.sections+QteSection(name="Sección "+(card.sections.size+1),timeLimit=2.0)))
            onActive(card.sections.size)
        }){Text("＋ Agregar sección")}
        Text("Añadir pulsaciones",fontWeight=FontWeight.Bold)
        QteButtonPad(onPress={button->
            if(card.sections.isEmpty()) return@QteButtonPad
            val index=active.coerceIn(0,card.sections.lastIndex)
            val section=card.sections[index]
            val list=card.sections.toMutableList()
            list[index]=section.copy(buttons=section.buttons+button)
            onChange(card.copy(sections=list))
        })
        Spacer(Modifier.height(48.dp))
    }
}

@Composable
private fun AnimationPanel(card:QteCard,onChange:(QteCard)->Unit) {
    var expanded by remember { mutableStateOf(false) }
    val a=card.animation
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
        Text("Animación procedural",style=MaterialTheme.typography.titleMedium,fontWeight=FontWeight.Bold)
        Box {
            OutlinedButton(onClick={expanded=true}) { Text(AnimationCatalog.label(a.type)) }
            DropdownMenu(expanded,onDismissRequest={expanded=false}) {
                AnimationCatalog.all.forEach { item ->
                    DropdownMenuItem(text={Text(item.label)},onClick={
                        expanded=false
                        onChange(card.copy(animation=a.copy(type=item.id)))
                    })
                }
            }
        }
        SliderField("Velocidad",a.speed,0.25,3.0){onChange(card.copy(animation=a.copy(speed=it)))}
        SliderField("Distancia",a.distance,0.0,500.0){onChange(card.copy(animation=a.copy(distance=it)))}
        SliderField("Duración",a.duration,0.2,4.0){onChange(card.copy(animation=a.copy(duration=it)))}
        SliderField("Estela",a.trailLength,0.0,2.0){onChange(card.copy(animation=a.copy(trailLength=it)))}
        Text("El modelo conserva animación, impactos, cámara y secuencias dentro del JSON.",color=MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun SliderField(label:String,value:Double,min:Double,max:Double,onChange:(Double)->Unit) {
    Column {
        Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){Text(label);Text("%.2f".format(value))}
        Slider(value.toFloat(),{onChange(it.toDouble())},valueRange=min.toFloat()..max.toFloat())
    }
}

@Composable
private fun StatsPanel(card:QteCard) {
    val s=card.stats
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)) {
        Text("Estadísticas",style=MaterialTheme.typography.titleMedium,fontWeight=FontWeight.Bold)
        listOf(
            "Usos" to s.uses.toString(),
            "Victorias" to s.wins.toString(),
            "Derrotas" to s.losses.toString(),
            "Daño promedio" to "%.2f".format(s.averageDamage),
            "Tiempo promedio" to "%.2f s".format(s.averageTime),
            "Precisión promedio" to "%.1f %%".format(s.averageAccuracy),
            "Mejor poder neto" to "%.2f".format(s.bestNetPower),
            "Mejor racha perfecta" to s.bestPerfectStreak.toString()
        ).forEach { pair ->
            ListItem(headlineContent={Text(pair.first)},trailingContent={Text(pair.second,fontWeight=FontWeight.Bold)})
            HorizontalDivider()
        }
    }
}
