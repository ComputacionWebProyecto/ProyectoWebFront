/**
 * DASHBOARD COMPONENT
 *
 * Componente principal de la aplicación que implementa un editor visual de procesos
 * de negocio estilo BPMN. Permite crear, editar y conectar activities, gateways y
 * edges mediante un canvas interactivo con drag & drop y pan/zoom.
 *
 * ARQUITECTURA GENERAL:
 * - Canvas visual con pan (desplazamiento) mediante Shift+Click o botón central del mouse
 * - Sistema de capas: gateways, activities y edges se gestionan en arrays separados
 * - Triple suscripción reactiva a tres servicios (gateway, activity, edge)
 * - Paneles laterales deslizables para CRUD de procesos, usuarios, roles y elementos
 * - Inspector lateral contextual que cambia según el tipo de elemento seleccionado
 *
 * GESTIÓN DE ESTADO:
 * - boardComponents: Array unificado que combina todas las capas para renderizado
 * - Capas separadas: activitiesLayer, edgesLayer (gateways se integran directamente)
 * - Cachés locales: activitiesCache, edgesCache para acceso rápido sin buscar en DOM
 * - Tracking de IDs vistos: seenActivityIds, seenEdgeIds para detectar nuevos elementos
 *
 * SISTEMA DE COORDENADAS:
 * - Pan global: panOffsetX, panOffsetY se aplican a todo el canvas
 * - Coordenadas locales: cada componente tiene su x, y relativo al canvas
 * - El SVG de edges usa las mismas coordenadas que los componentes (no resta el pan)
 *
 * DRAG & DROP:
 * - Desde menú lateral: crea nuevos elementos en el canvas
 * - Elementos existentes: mueve su posición y actualiza en el servicio correspondiente
 * - isDraggingExisting: flag para distinguir entre crear nuevo vs mover existente
 *
 * PANELES LATERALES:
 * - Process, User, Role: paneles mutuamente excluyentes (solo uno abierto a la vez)
 * - Inspector: panel contextual para activity/edge/gateway (puede coexistir con otros)
 *
 * INTEGRACIÓN CON SERVICIOS:
 * - GatewayService, ActivityService, EdgeService: CRUD reactivo con stores in-memory
 * - ActiveProcessService: gestión del proceso actualmente activo
 * - Triple suscripción en ngOnInit para mantener sincronizado el canvas
 *
 * FORMATO DUAL (TYPED + LEGACY):
 * - Activities: siempre formato moderno (x, y, width, height)
 * - Edges: soporta fromType/fromId/toType/toId (moderno) y activitySourceId/activityDestinyId (legacy)
 * - Gateways: formato moderno (type, x, y)
 *
 * RENDERIZADO:
 * - Componentes visuales: HTML con posicionamiento absoluto (activities, gateways)
 * - Conexiones: SVG overlay con líneas calculadas entre centros de nodos
 * - Change detection manual: usa ChangeDetectorRef.detectChanges() en operaciones críticas
 *
 * NAVEGACIÓN DEL CANVAS:
 * - Shift + Click izquierdo: activa modo pan
 * - Botón central del mouse: activa modo pan
 * - Indicador visual: cursor cambia a "grabbing", clase CSS "shift-active"
 *
 * FLUJOS PRINCIPALES:
 * 1. Crear elemento: Drag desde menú → onBoardDrop → addComponentToBoard → servicio.create()
 * 2. Mover elemento: Drag elemento → onBoardDrop → updatePosition → servicio.update()
 * 3. Conectar nodos: Abrir EdgePanel → seleccionar origen/destino → edgeService.create()
 * 4. Editar elemento: Click → openInspector → panel contextual → cambios → servicio.update()
 *
 * OPTIMIZACIONES:
 * - trackBy functions para *ngFor (evita recrear elementos en cada cambio)
 * - Cachés locales para evitar búsquedas repetidas
 * - Detección de cambios manual solo cuando es necesario
 * - Capas separadas para minimizar recálculos
 */

import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DropdownMenuComponent } from './drop-menu/drop-menu';
import { HeaderDashboard } from './header-dashboard/header-dashboard';
import { ProcessPanel } from './process-panel/process-panel';
import { UserPanel } from './user-panel/user-panel';
import { RolePanel } from './role-panel/role-panel';
import { WelcomeBanner } from './welcome-banner';

import { GatewayService } from '../../services/gateway.service';
import { ActiveProcessService } from '../../services/active-process.service';
import { RoleService } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';

import { Gateway } from '../../models/Gateway';
import { Activity } from '../../models/Activity';
import { Edge } from '../../models/Edge';

import { ActivityService } from '../../services/activity.service';
import { EdgeService } from '../../services/edge.service';

import { ActivityPanel } from './activity/activity-panel';
import { EdgePanel } from './edge/edge-panel';
import { GatewayPanel } from './gateway/gateway-panel';
import { Subscription } from 'rxjs';

/**
 * BOARD COMPONENT INTERFACE
 *
 * Representa un elemento visual en el canvas del dashboard.
 * Puede ser una activity, un gateway o un edge (conexión).
 *
 * PROPÓSITO:
 * Unificar la representación de diferentes tipos de elementos en un solo array
 * para simplificar el renderizado y la gestión de eventos drag & drop.
 *
 * CAMPOS COMUNES:
 * - id: Identificador único del componente visual (ej: "gateway-5", "activity-12", "edge-3")
 * - type: Tipo específico del elemento (ej: "decision-gateway", "task-user", "edge-line")
 * - category: Categoría general del elemento ("gateway" | "activity" | "edge")
 * - x, y: Coordenadas en el canvas (píxeles relativos al origen del canvas)
 * - label: Texto descriptivo para mostrar en la UI
 *
 * CAMPOS OPCIONALES POR CATEGORÍA:
 * - gatewayId: Solo para gateways, referencia al id en GatewayService
 * - activityId: Solo para activities, referencia al id en ActivityService
 * - edgeId: Solo para edges, referencia al id en EdgeService
 *
 * CAMPOS PARA EDGES:
 * - fromId, toId: IDs de los nodos origen/destino (pueden ser activities o gateways)
 * - Estos campos permiten calcular las coordenadas de las líneas SVG
 *
 * CAMPOS PARA ACTIVITIES:
 * - width, height: Dimensiones del rectángulo visual (default: 100x60)
 * - Permiten calcular el centro del nodo para conectar edges
 *
 * EJEMPLO GATEWAY:
 * ```typescript
 * {
 *   id: "gateway-7",
 *   type: "decision-gateway",
 *   category: "gateway",
 *   x: 300,
 *   y: 200,
 *   label: "Decisión",
 *   gatewayId: 7
 * }
 * ```
 *
 * EJEMPLO ACTIVITY:
 * ```typescript
 * {
 *   id: "activity-12",
 *   type: "task-user",
 *   category: "activity",
 *   x: 450,
 *   y: 150,
 *   width: 100,
 *   height: 60,
 *   label: "Revisar documento",
 *   activityId: 12
 * }
 * ```
 *
 * EJEMPLO EDGE:
 * ```typescript
 * {
 *   id: "edge-3",
 *   type: "edge-line",
 *   category: "edge",
 *   x: 0,  // no usado para edges
 *   y: 0,  // no usado para edges
 *   label: "Flujo aprobado",
 *   edgeId: 3,
 *   fromId: 12,  // desde activity 12
 *   toId: 7      // hacia gateway 7
 * }
 * ```
 */
interface BoardComponent {
  id: string;
  type: string;
  category: string; // 'gateway' | 'activity' | 'edge'
  x: number;
  y: number;
  label?: string;
  gatewayId?: number;

  // ids de entidades
  activityId?: number;
  edgeId?: number;

  // Para trazar edges y centrar activities
  fromId?: number; // activity source (o activitySourceId)
  toId?: number;   // activity destiny (o activityDestinyId)
  width?: number;
  height?: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DropdownMenuComponent,
    HeaderDashboard,
    ProcessPanel,
    UserPanel,
    RolePanel,
    ActivityPanel,
    EdgePanel,
    GatewayPanel,
    WelcomeBanner,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit, OnDestroy {
  /**
   * LÍMITES DEL CANVAS
   *
   * Define el área navegable del canvas para evitar que los usuarios
   * se pierdan en coordenadas infinitas.
   *
   * RANGO: -1500 a +1500 en ambos ejes (X e Y)
   *
   * PROPÓSITO:
   * - Prevenir navegación infinita
   * - Mantener elementos en área visible
   * - Mejorar usabilidad
   */
  readonly MIN_CANVAS_X = -1500;
  readonly MAX_CANVAS_X = 1500;
  readonly MIN_CANVAS_Y = -1500;
  readonly MAX_CANVAS_Y = 1500;

  /**
   * PROPIEDADES DE CONTROL DE UI
   *
   * Gestionan la visibilidad y estado de los diferentes paneles laterales.
   */

  /**
   * Controla la visibilidad de la sidebar izquierda con el menú de componentes.
   *
   * VALOR POR DEFECTO: true (sidebar visible)
   *
   * TOGGLE: toggleSidebar()
   */
  isSidebarOpen = true;

  /**
   * Controla la visibilidad del panel de gestión de procesos.
   *
   * EXCLUSIVIDAD: Mutuamente excluyente con isUserPanelOpen e isRolePanelOpen
   *
   * TOGGLE: toggleProcessPanel()
   */
  isProcessPanelOpen = false;

  /**
   * Controla la visibilidad del panel de gestión de usuarios.
   *
   * EXCLUSIVIDAD: Mutuamente excluyente con isProcessPanelOpen e isRolePanelOpen
   *
   * TOGGLE: toggleUserPanel()
   */
  isUserPanelOpen = false;

  /**
   * Controla la visibilidad del panel de gestión de roles.
   *
   * EXCLUSIVIDAD: Mutuamente excluyente con isProcessPanelOpen e isUserPanelOpen
   *
   * TOGGLE: onToggleRoles()
   */
  isRolePanelOpen = false;

  /**
   * INSPECTOR LATERAL CONTEXTUAL
   *
   * El inspector es un panel lateral que muestra el formulario CRUD correspondiente
   * al tipo de elemento seleccionado (activity, edge o gateway).
   */

  /**
   * Controla la visibilidad del inspector lateral.
   *
   * COMPORTAMIENTO:
   * Se abre automáticamente al:
   * - Hacer drag & drop de un nuevo elemento
   * - Hacer clic en un elemento existente del canvas
   * - Seleccionar "Edge" desde el menú (caso especial, no crea visual)
   */
  inspectorOpen = false;

  /**
   * Define el tipo de inspector a mostrar.
   *
   * VALORES:
   * - 'activity': Muestra ActivityPanel con formulario de activities
   * - 'edge': Muestra EdgePanel con selectores mixtos para conexiones
   * - 'gateway': Muestra GatewayPanel con selector de tipos de gateway
   * - null: No hay inspector activo
   *
   * SINCRONIZACIÓN:
   * Cambia junto con selectedActivityId/selectedEdgeId/selectedGatewayId
   */
  inspectorKind: 'activity' | 'edge' | 'gateway' | null = null;

  /**
   * ID de la activity seleccionada para editar en el inspector.
   *
   * VALOR: number cuando hay una activity seleccionada, null en caso contrario
   *
   * VINCULACIÓN: Se pasa como @Input al ActivityPanel
   */
  selectedActivityId: number | null = null;

  /**
   * ID del edge seleccionado para editar en el inspector.
   *
   * VALOR: number cuando hay un edge seleccionado, null en caso contrario
   *
   * VINCULACIÓN: Se pasa como @Input al EdgePanel
   *
   * NOTA: Actualmente EdgePanel no usa modo edición activo, pero mantiene
   * esta propiedad por consistencia y extensibilidad futura.
   */
  selectedEdgeId: number | null = null;

  /**
   * ID del gateway seleccionado para editar en el inspector.
   *
   * VALOR: number cuando hay un gateway seleccionado, null en caso contrario
   *
   * VINCULACIÓN: Se pasa como @Input al GatewayPanel
   */
  selectedGatewayId: number | null = null;

  /**
   * ESTADO DEL CANVAS - COMPONENTES
   *
   * Gestión del contenido visual del canvas.
   */

  /**
   * Array unificado de todos los componentes visibles en el canvas.
   *
   * COMPOSICIÓN:
   * Combina tres capas: gateways + activitiesLayer + edgesLayer
   *
   * ACTUALIZACIÓN:
   * Se recalcula en recomputeBoardIncludeCurrentGateways() después de cada
   * cambio en las capas individuales.
   *
   * RENDERIZADO:
   * El template itera sobre este array con *ngFor para dibujar todos los elementos.
   *
   * OPTIMIZACIÓN:
   * Usa trackByComponent para evitar recrear elementos innecesariamente.
   */
  boardComponents: BoardComponent[] = [];

  /**
   * Contador interno para generar IDs temporales únicos.
   *
   * PROPÓSITO:
   * Crear IDs locales para elementos que aún no tienen ID del backend.
   *
   * FORMATO:
   * Se convierte a hexadecimal y se usa como: "temp-timestamp-random"
   *
   * RESET:
   * Se reinicia cada millón de incrementos para evitar desbordamiento.
   */
  private componentCounter = 0;

  /**
   * Flag que indica si se está arrastrando un elemento existente.
   *
   * PROPÓSITO:
   * Distinguir entre:
   * - Drag desde menú (crear nuevo): isDraggingExisting = false
   * - Drag de elemento en canvas (mover): isDraggingExisting = true
   *
   * EFECTO EN DROP:
   * Cambia el comportamiento de onBoardDrop() según su valor.
   */
  private isDraggingExisting = false;

  /**
   * SISTEMA DE CAPAS
   *
   * El canvas se gestiona mediante tres capas independientes que se combinan
   * para formar boardComponents.
   */

  /**
   * Capa de activities.
   *
   * CONTENIDO:
   * BoardComponents generados desde activitiesCache.
   *
   * ACTUALIZACIÓN:
   * Se regenera completamente en subscribeActivitiesStream() cada vez que
   * el ActivityService emite cambios.
   */
  private activitiesLayer: BoardComponent[] = [];

  /**
   * Capa de edges.
   *
   * CONTENIDO:
   * BoardComponents generados desde edgesCache.
   *
   * PARTICULARIDAD:
   * Los edges NO tienen representación visual como círculo/rectángulo.
   * Solo existen como entrada en boardComponents para que edgeCoordsByComponent()
   * pueda calcular las coordenadas de las líneas SVG.
   *
   * ACTUALIZACIÓN:
   * Se regenera completamente en subscribeEdgesStream() cada vez que
   * el EdgeService emite cambios.
   */
  private edgesLayer: BoardComponent[] = [];

  /**
   * CACHÉS LOCALES
   *
   * Copias locales de los datos de los servicios para acceso rápido y
   * resolución de referencias sin necesidad de observables anidados.
   */

  /**
   * Caché local de todas las activities.
   *
   * PROPÓSITO:
   * - Generación rápida de activitiesLayer
   * - Resolución de endpoints en edges (fromId/toId)
   * - Actualización de posiciones sin consultar el servicio
   *
   * SINCRONIZACIÓN:
   * Se actualiza automáticamente en subscribeActivitiesStream().
   */
  private activitiesCache: Activity[] = [];

  /**
   * Caché local de todos los edges.
   *
   * PROPÓSITO:
   * - Generación rápida de edgesLayer
   * - Cálculo de coordenadas SVG en edgeCoordsByComponent()
   * - Resolución de tipos tipados (fromType/fromId/toType/toId)
   *
   * SINCRONIZACIÓN:
   * Se actualiza automáticamente en subscribeEdgesStream().
   */
  private edgesCache: Edge[] = [];

  /**
   * TRACKING DE IDS VISTOS
   *
   * Sets que mantienen registro de todos los IDs que han pasado por el sistema
   * para detectar elementos nuevos y actualizar el inspector automáticamente.
   */

  /**
   * Set de IDs de activities ya vistos.
   *
   * PROPÓSITO:
   * Detectar activities recién creados comparando con el set anterior.
   *
   * COMPORTAMIENTO:
   * Cuando se detecta un nuevo ID y el inspector está abierto en modo activity,
   * se actualiza selectedActivityId automáticamente para mostrar el nuevo elemento.
   */
  private seenActivityIds = new Set<number>();

  /**
   * Set de IDs de edges ya vistos.
   *
   * PROPÓSITO:
   * Detectar edges recién creados comparando con el set anterior.
   *
   * COMPORTAMIENTO:
   * Cuando se detecta un nuevo ID y el inspector está abierto en modo edge,
   * se actualiza selectedEdgeId automáticamente para mostrar el nuevo elemento.
   */
  private seenEdgeIds = new Set<number>();

  /**
   * GESTIÓN DEL PROCESO ACTIVO
   *
   * Integración con ActiveProcessService para tracking del proceso actual.
   */

  /**
   * ID del proceso actualmente activo/seleccionado.
   *
   * PROPÓSITO:
   * Filtrar activities/edges/gateways que pertenecen al proceso actual.
   *
   * SINCRONIZACIÓN:
   * Se actualiza automáticamente vía suscripción a currentProcess$ en ngOnInit.
   *
   * PERSISTENCIA:
   * ActiveProcessService restaura el proceso activo desde localStorage al iniciar.
   */
  currentProcessId: number | null = null;

  /**
   * Nombre del proceso actualmente activo.
   *
   * PROPÓSITO:
   * Mostrar al usuario en qué proceso está trabajando mediante texto legible,
   * no solo un ID numérico de la base de datos.
   *
   * EJEMPLO:
   * "Proceso de Aprobación de Compras" en lugar de "ID: 67"
   */
  currentProcessName: string | null = null;

  /**
   * Suscripción al stream de proceso activo.
   *
   * PROPÓSITO:
   * Mantener sincronizado currentProcessId y currentProcessName con el servicio.
   *
   * LIMPIEZA:
   * Se cancela en ngOnDestroy para prevenir memory leaks.
   */
  private processSubscription?: Subscription;

  /**
   * ESTADO DEL PAN (DESPLAZAMIENTO DEL CANVAS)
   *
   * Sistema de navegación que permite desplazar el canvas completo mediante
   * Shift+Click o botón central del mouse.
   */

  /**
   * Nivel de zoom del canvas.
   *
   * VALORES:
   * - 1.0: Tamaño normal (100%)
   * - 0.5: Reducido al 50% (vista macro)
   * - 2.0: Ampliado al 200% (vista micro)
   *
   * RANGO PERMITIDO:
   * Mínimo: 0.1 (10%) - Máximo: 5.0 (500%)
   *
   * APLICACIÓN:
   * Se usa en getCanvasTransform() para aplicar scale() CSS.
   *
   * CONTROLES:
   * - Scroll del mouse (Ctrl+Scroll): ajusta zoom
   * - Botones +/- en UI: incrementos de 0.1
   * - Botón Reset: vuelve a 1.0
   */
  zoomLevel = 1.0;

  /**
   * Indica si el usuario está actualmente panning (arrastrando el canvas).
   *
   * ACTIVACIÓN:
   * - Shift + Click izquierdo sobre el canvas
   * - Click botón central del mouse
   *
   * CONDICIONES:
   * - Solo se activa si NO se hace click sobre un componente, sidebar o header.
   */
  isPanning = false;

  /**
   * Desplazamiento horizontal acumulado del canvas (píxeles).
   *
   * APLICACIÓN:
   * Se usa en getCanvasTransform() para generar el CSS transform del canvas.
   *
   * VALORES:
   * - Positivo: canvas desplazado a la derecha
   * - Negativo: canvas desplazado a la izquierda
   */
  panOffsetX = 0;

  /**
   * Desplazamiento vertical acumulado del canvas (píxeles).
   *
   * APLICACIÓN:
   * Se usa en getCanvasTransform() para generar el CSS transform del canvas.
   *
   * VALORES:
   * - Positivo: canvas desplazado hacia abajo
   * - Negativo: canvas desplazado hacia arriba
   */
  panOffsetY = 0;

  /**
   * Posición X del pan al inicio del drag actual.
   *
   * PROPÓSITO:
   * Guardar el offset inicial para calcular el delta durante el movimiento.
   *
   * USO:
   * panOffsetX = startPanX + (mouseX - lastMouseX)
   */
  startPanX = 0;

  /**
   * Posición Y del pan al inicio del drag actual.
   *
   * PROPÓSITO:
   * Guardar el offset inicial para calcular el delta durante el movimiento.
   *
   * USO:
   * panOffsetY = startPanY + (mouseY - lastMouseY)
   */
  startPanY = 0;

  /**
   * Última posición X registrada del mouse durante el pan.
   *
   * PROPÓSITO:
   * Calcular el desplazamiento relativo en onMouseMove.
   *
   * ACTUALIZACIÓN:
   * Se guarda en onMouseDown y se compara en cada onMouseMove.
   */
  lastMouseX = 0;

  /**
   * Última posición Y registrada del mouse durante el pan.
   *
   * PROPÓSITO:
   * Calcular el desplazamiento relativo en onMouseMove.
   *
   * ACTUALIZACIÓN:
   * Se guarda en onMouseDown y se compara en cada onMouseMove.
   */
  lastMouseY = 0;

  /**
   * Indica si la tecla Shift está presionada.
   *
   * PROPÓSITO:
   * - Activar modo pan con Shift + Click izquierdo
   * - Mostrar indicador visual (clase CSS "shift-active" en board-area)
   *
   * LISTENERS:
   * - @HostListener('document:keydown.shift'): establece en true
   * - @HostListener('document:keyup.shift'): establece en false
   */
  isShiftPressed = false;

  /**
   * BANNER DE BIENVENIDA
   *
   * Sistema para mostrar avisos contextuales cuando el usuario no tiene procesos o roles.
   */

  /**
   * Indica si el usuario ha ocultado manualmente el banner de proceso.
   * Se usa para no mostrar el banner repetidamente después de que el usuario lo cierre.
   */
  processAlertDismissed = false;

  /**
   * Indica si el usuario ha ocultado manualmente el banner de roles.
   * Se usa para no mostrar el banner repetidamente después de que el usuario lo cierre.
   */
  roleAlertDismissed = false;

  /**
   * Indica si la compañía del usuario tiene al menos un rol.
   * Se usa para mostrar/ocultar el banner de creación de roles.
   */
  hasRole = false;

  /**
   * CONSTRUCTOR
   *
   * Inyecta las cuatro dependencias principales del Dashboard.
   *
   * SERVICIOS:
   * - ActivityService: Gestión CRUD de activities con store reactivo
   * - EdgeService: Gestión CRUD de edges con soporte dual format
   * - GatewayService: Gestión CRUD de gateways con tipos (decision/parallel/exclusive)
   * - ActiveProcessService: Tracking del proceso actualmente seleccionado
   * - ChangeDetectorRef: Detección manual de cambios para actualizaciones asíncronas
   *
   * USO DE CDR:
   * Se invoca detectChanges() después de operaciones asíncronas que modifican
   * el estado visual (pan, streams de servicios, actualizaciones de posición).
   *
   * INICIALIZACIÓN:
   * La suscripción a streams y setup del canvas se realiza en ngOnInit,
   * no en el constructor, siguiendo las mejores prácticas de Angular.
   */
  constructor(
    private activityService: ActivityService,
    private edgeService: EdgeService,
    private gatewayService: GatewayService,
    private activeProcessService: ActiveProcessService,
    private roleService: RoleService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * HOST LISTENERS - SISTEMA DE PAN Y NAVEGACIÓN
   *
   * Conjunto de listeners que implementan el sistema de pan (desplazamiento)
   * del canvas mediante Shift+Click o botón central del mouse.
   *
   * ARQUITECTURA:
   * - Listeners de teclado (document): Detectan Shift presionado/soltado globalmente
   * - Listeners de mouse (local): Gestionan inicio, movimiento y fin del pan
   *
   * FLUJO COMPLETO:
   * 1. Usuario presiona Shift (o usa botón central)
   * 2. Usuario hace click en área libre del canvas
   * 3. onMouseDown activa isPanning y guarda posición inicial
   * 4. onMouseMove calcula delta y actualiza panOffsetX/Y
   * 5. onMouseUp desactiva isPanning
   *
   * FEEDBACK VISUAL:
   * - isShiftPressed añade clase CSS "shift-active" al canvas
   * - isPanning cambia el cursor a "grabbing"
   */

  /**
   * Listener: Tecla Shift presionada (global)
   *
   * PROPÓSITO:
   * Activar indicador visual que muestra al usuario que puede hacer pan
   * presionando click izquierdo.
   *
   * EFECTO CSS:
   * board-area recibe clase "shift-active" que cambia el cursor a "grab"
   *
   * NOTA:
   * No activa directamente el pan, solo prepara la UI. El pan se activa
   * en onMouseDown cuando se cumplan las condiciones.
   */
  @HostListener('document:keydown.shift')
  onShiftDown() {
    this.isShiftPressed = true;
  }

  /**
   * Listener: Tecla Shift soltada (global)
   *
   * PROPÓSITO:
   * Desactivar indicador visual cuando el usuario suelta Shift.
   *
   * EFECTO CSS:
   * board-area pierde clase "shift-active" y cursor vuelve a default
   *
   * COMPORTAMIENTO:
   * Si el usuario estaba panning y suelta Shift, el pan continúa hasta
   * que suelte el botón del mouse (isPanning se gestiona en onMouseUp).
   */
  @HostListener('document:keyup.shift')
  onShiftUp() {
    this.isShiftPressed = false;
  }

  /**
   * Listener: Mouse presionado (inicio de pan)
   *
   * PROPÓSITO:
   * Detectar inicio de operación de pan y guardar estado inicial.
   *
   * CONDICIONES PARA ACTIVAR PAN:
   * 1. Botón central (event.button === 1) O
   * 2. Botón izquierdo (event.button === 0) + Shift presionado
   * 3. Y el target NO es un componente/sidebar/header
   * 4. Y el target SÍ está dentro del board-area
   *
   * VALIDACIÓN DE TARGET:
   * - closest('.board-component'): Evita pan si click en activity/gateway/edge
   * - closest('aside'): Evita pan si click en sidebar o paneles laterales
   * - closest('header'): Evita pan si click en header superior
   * - closest('.board-area'): Asegura que el click es dentro del canvas
   *
   * GUARDADO DE ESTADO:
   * - startPanX/Y: Offset actual del canvas (referencia para calcular delta)
   * - lastMouseX/Y: Posición actual del mouse (referencia para calcular movimiento)
   * - isPanning: Flag que activa el seguimiento en onMouseMove
   *
   * PREVENCIÓN DE DRAG ACCIDENTAL:
   * event.preventDefault() evita que el navegador inicie drag nativo
   * cuando se usa botón central.
   */
  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
      if (
        !target.closest('.board-component') &&
        !target.closest('aside') &&
        !target.closest('header') &&
        target.closest('.board-area')
      ) {
        event.preventDefault();
        this.isPanning = true;
        this.startPanX = this.panOffsetX;
        this.startPanY = this.panOffsetY;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        document.body.style.cursor = 'grabbing';
      }
    }
  }

  /**
   * Listener: Mouse movido (desplazamiento del canvas)
   *
   * PROPÓSITO:
   * Calcular y aplicar el desplazamiento del canvas durante el pan.
   *
   * CONDICIÓN:
   * Solo actúa si isPanning === true (activado en onMouseDown).
   *
   * CÁLCULO DEL DELTA:
   * deltaX = event.clientX - this.lastMouseX
   * deltaY = event.clientY - this.lastMouseY
   *
   * APLICACIÓN:
   * panOffsetX = startPanX + deltaX
   * panOffsetY = startPanY + deltaY
   *
   * FEEDBACK VISUAL:
   * Cambia cursor a "grabbing" para indicar operación activa.
   *
   * COORDENADAS:
   * clientX/Y son relativas al viewport (no se ven afectadas por scroll).
   */
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isPanning) {
      event.preventDefault();
      const dx = event.clientX - this.lastMouseX;
      const dy = event.clientY - this.lastMouseY;

      // Calcular nuevo offset sin límites
      let newPanX = this.startPanX + dx;
      let newPanY = this.startPanY + dy;

      // Aplicar límites del canvas (-1500 a +1500)
      // Los límites se ajustan según el zoom para mantener consistencia visual
      const limitX = this.MAX_CANVAS_X * this.zoomLevel;
      const limitY = this.MAX_CANVAS_Y * this.zoomLevel;

      newPanX = Math.max(-limitX, Math.min(limitX, newPanX));
      newPanY = Math.max(-limitY, Math.min(limitY, newPanY));

      this.panOffsetX = newPanX;
      this.panOffsetY = newPanY;
      this.cdr.detectChanges();
    }
  }

  /**
   * Listener: Mouse soltado (fin del pan)
   *
   * PROPÓSITO:
   * Finalizar operación de pan y restaurar cursor.
   *
   * CONDICIÓN:
   * Solo actúa si isPanning === true.
   *
   * LIMPIEZA:
   * - isPanning = false: Detiene el tracking en onMouseMove
   * - cursor = 'default': Restaura cursor normal
   *
   * PERSISTENCIA:
   * Los valores panOffsetX/Y se mantienen para el próximo pan.
   */
  @HostListener('document:mouseup')
  onMouseUp() {
    if (this.isPanning) {
      this.isPanning = false;
      document.body.style.cursor = 'default';
    }
  }

  /**
   * Utilidad: Generar CSS transform para el canvas
   *
   * PROPÓSITO:
   * Crear string CSS para aplicar desplazamiento (pan) y zoom (scale) al canvas.
   *
   * RETORNO:
   * String en formato: "translate(Xpx, Ypx) scale(Z)"
   *
   * ORDEN DE TRANSFORMACIONES:
   * 1. translate: Desplaza el canvas (pan)
   * 2. scale: Aplica zoom (ampliación/reducción)
   *
   * USO:
   * Se aplica al contenedor principal del canvas vía [style.transform]
   * en el template HTML.
   *
   * EJEMPLO:
   * - panOffsetX=100, panOffsetY=-50, zoomLevel=1.5
   * - Retorna: "translate(100px, -50px) scale(1.5)"
   *
   * NOTA:
   * El orden importa: translate antes de scale para que el pan
   * no se vea afectado por el nivel de zoom.
   */
  getCanvasTransform(): string {
    return `translate(${this.panOffsetX}px, ${this.panOffsetY}px) scale(${this.zoomLevel})`;
  }

  /**
   * SISTEMA DE ZOOM
   *
   * Permite ampliar o reducir la vista del canvas para facilitar
   * el trabajo con procesos grandes (vista macro) o detalle fino (vista micro).
   */

  /**
   * Aumenta el nivel de zoom del canvas.
   *
   * INCREMENTO: +0.1 por cada llamada (10%)
   * MÁXIMO: 5.0 (500%)
   */
  zoomIn(): void {
    if (this.zoomLevel < 5.0) {
      this.zoomLevel = Math.min(5.0, this.zoomLevel + 0.1);
      this.zoomLevel = Math.round(this.zoomLevel * 10) / 10;
      console.log(`[Dashboard] Zoom In: ${Math.round(this.zoomLevel * 100)}%`);
    }
  }

  /**
   * Reduce el nivel de zoom del canvas.
   *
   * DECREMENTO: -0.1 por cada llamada (10%)
   * MÍNIMO: 0.1 (10%)
   */
  zoomOut(): void {
    if (this.zoomLevel > 0.1) {
      this.zoomLevel = Math.max(0.1, this.zoomLevel - 0.1);
      this.zoomLevel = Math.round(this.zoomLevel * 10) / 10;
      console.log(`[Dashboard] Zoom Out: ${Math.round(this.zoomLevel * 100)}%`);
    }
  }

  /**
   * Resetea el zoom a nivel normal (100%).
   */
  resetZoom(): void {
    this.zoomLevel = 1.0;
    console.log('[Dashboard] Zoom Reset: 100%');
  }

  /**
   * Listener: Scroll del mouse con Ctrl presionado para zoom.
   *
   * COMPORTAMIENTO:
   * - Ctrl + Scroll Up: Zoom In
   * - Ctrl + Scroll Down: Zoom Out
   */
  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    if (event.ctrlKey) {
      event.preventDefault();
      if (event.deltaY < 0) {
        this.zoomIn();
      } else {
        this.zoomOut();
      }
    }
  }

  /**
   * Centrar el canvas en el origen (0, 0).
   *
   * PROPÓSITO:
   * Proporcionar un botón "Home" que permita al usuario volver rápidamente
   * al punto de origen del canvas donde se crean los elementos por defecto.
   *
   * COMPORTAMIENTO:
   * 1. Calcula el centro del viewport del navegador
   * 2. Ajusta panOffsetX y panOffsetY para que el punto (0,0) del canvas
   *    quede centrado en la pantalla
   * 3. Dispara detección de cambios para actualizar la vista
   *
   * CÁLCULO:
   * Para centrar el origen en la pantalla:
   * - panOffsetX = mitad del ancho del viewport
   * - panOffsetY = mitad del alto del viewport
   *
   * EJEMPLO:
   * Si el viewport es 1920x1080:
   * - panOffsetX = 960px
   * - panOffsetY = 540px
   * Esto hace que el punto (0,0) del canvas aparezca en el centro de la pantalla.
   *
   * USO:
   * Se llama desde el botón "Home" en la UI o al cargar el dashboard por primera vez.
   */
  centerOnOrigin(): void {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Centrar el origen (0,0) en el viewport
    // Restamos la mitad del ancho de la sidebar (aprox 250px) y header (64px)
    this.panOffsetX = (viewportWidth - 250) / 2;
    this.panOffsetY = (viewportHeight - 64) / 2;

    console.log('[Dashboard] Canvas centrado en origen (0,0)');
    this.cdr.detectChanges();
  }

  /**
   * Obtener coordenada X actual del centro de la vista.
   *
   * PROPÓSITO:
   * Calcular qué coordenada X del canvas está actualmente en el centro del viewport.
   *
   * CÁLCULO:
   * El centro del viewport menos el offset de pan nos da la coordenada del canvas.
   * Se tiene en cuenta el ancho de la sidebar (250px).
   *
   * RETORNO:
   * Coordenada X del canvas que está en el centro de la vista, redondeada.
   */
  getCurrentViewX(): number {
    const viewportWidth = window.innerWidth;
    const centerViewportX = (viewportWidth - 250) / 2;
    return Math.round(centerViewportX - this.panOffsetX);
  }

  /**
   * Obtener coordenada Y actual del centro de la vista.
   *
   * PROPÓSITO:
   * Calcular qué coordenada Y del canvas está actualmente en el centro del viewport.
   *
   * CÁLCULO:
   * El centro del viewport menos el offset de pan nos da la coordenada del canvas.
   * Se tiene en cuenta la altura del header (64px).
   *
   * RETORNO:
   * Coordenada Y del canvas que está en el centro de la vista, redondeada.
   */
  getCurrentViewY(): number {
    const viewportHeight = window.innerHeight;
    const centerViewportY = (viewportHeight - 64) / 2;
    return Math.round(centerViewportY - this.panOffsetY);
  }

  /**
   * Navegar a una posición específica del canvas.
   *
   * PROPÓSITO:
   * Centrar la vista del canvas en las coordenadas especificadas (x, y).
   * Útil para hacer "zoom to" sobre un elemento específico al hacer click
   * en su nombre desde un panel lateral.
   *
   * COMPORTAMIENTO:
   * 1. Calcula el centro del viewport
   * 2. Ajusta panOffsetX y panOffsetY para que el punto (x, y) del canvas
   *    aparezca centrado en la pantalla
   * 3. Aplica los límites del canvas para evitar posiciones fuera de rango
   * 4. Dispara detección de cambios
   *
   * CÁLCULO:
   * Para centrar el punto (x,y) en la pantalla:
   * - panOffsetX = (ancho_viewport / 2) - (x * zoom)
   * - panOffsetY = (alto_viewport / 2) - (y * zoom)
   *
   * EJEMPLO:
   * navigateToPosition(200, 300) → Centra la vista en la coordenada (200, 300)
   *
   * @param x Coordenada X del canvas a centrar
   * @param y Coordenada Y del canvas a centrar
   */
  navigateToPosition(x: number, y: number): void {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calcular el centro del viewport (considerando sidebar y header)
    const centerViewportX = (viewportWidth - 250) / 2;
    const centerViewportY = (viewportHeight - 64) / 2;

    // Calcular el pan necesario para centrar el punto (x,y)
    // Fórmula: panOffset = centroViewport - (coordenadaCanvas * zoom)
    let newPanX = centerViewportX - (x * this.zoomLevel);
    let newPanY = centerViewportY - (y * this.zoomLevel);

    // Aplicar límites del canvas
    const limitX = this.MAX_CANVAS_X * this.zoomLevel;
    const limitY = this.MAX_CANVAS_Y * this.zoomLevel;

    newPanX = Math.max(-limitX, Math.min(limitX, newPanX));
    newPanY = Math.max(-limitY, Math.min(limitY, newPanY));

    this.panOffsetX = newPanX;
    this.panOffsetY = newPanY;

    console.log(`[Dashboard] Navegando a posición (${x}, ${y})`);
    this.cdr.detectChanges();
  }

  /**
   * Utilidad: Mapear tipos de componentes a etiquetas legibles
   *
   * PROPÓSITO:
   * Convertir tipos internos de componentes a nombres amigables para mostrar en la UI.
   *
   * MAPEO:
   * - 'decision-gateway' → 'Decisión'
   * - 'parallel-gateway' → 'Paralelo'
   * - 'exclusive-gateway' → 'Exclusivo'
   * - 'task-user' → 'Tarea de Usuario'
   * - 'event-start' → 'Evento Inicio'
   *
   * FALLBACK:
   * Si el tipo no está en el mapeo, retorna el tipo original sin transformar.
   *
   * USO:
   * Principalmente para mostrar etiquetas en el menú lateral y tooltips.
   */
  public getComponentLabel(type: string): string {
    const labels: Record<string, string> = {
      'decision-gateway': 'Decisión',
      'parallel-gateway': 'Paralelo',
      'exclusive-gateway': 'Exclusivo',
      'task-user': 'Tarea de Usuario',
      'event-start': 'Evento Inicio',
    };
    return labels[type] ?? type;
  }

  /**
   * FLUJO DE INICIALIZACIÓN
   *
   * 1. Restaurar proceso activo desde localStorage
   * 2. Suscribirse a cambios del proceso activo
   * 3. Suscribirse a streams de gateways, activities y edges
   *
   * RESTAURACIÓN DEL PROCESO:
   * activeProcessService.restoreActiveProcess() lee el proceso desde localStorage
   * y lo publica en el Observable currentProcess$.
   *
   * SUSCRIPCIÓN AL PROCESO:
   * Mantiene sincronizados currentProcessId y currentProcessName con el servicio.
   * Al cambiar el proceso, se dispara detectChanges() para actualizar la UI.
   *
   * SUSCRIPCIONES A STREAMS:
   * - subscribeGatewaysStream(): Sincroniza gateways desde GatewayService
   * - subscribeActivitiesStream(): Sincroniza activities desde ActivityService
   * - subscribeEdgesStream(): Sincroniza edges desde EdgeService
   *
   * CARGA AUTOMÁTICA:
   * Los servicios cargan datos desde sus stores in-memory al iniciar,
   * no es necesario llamar .list() explícitamente.
   */
  ngOnInit(): void {
    // Centrar canvas en el origen (0,0) al iniciar
    this.centerOnOrigin();

    // Verificar si la compañía tiene roles
    this.checkIfCompanyHasRoles();

    // Streams reactivos (se cargan automáticamente desde el store en memoria)
    this.subscribeGatewaysStream();
    this.subscribeActivitiesStream();
    this.subscribeEdgesStream();

    // Proceso activo - restaurar y suscribirse
    this.activeProcessService.restoreActiveProcess();
    this.processSubscription = this.activeProcessService.currentProcess$.subscribe((process) => {
      const previousProcessId = this.currentProcessId;
      this.currentProcessId = process?.id ?? null;
      this.currentProcessName = process?.name ?? null;
      console.log(`[Dashboard] Proceso activo cambió: ${process?.name ?? 'ninguno'} (ID: ${process?.id ?? 'null'})`);

      // Si el proceso activo cambió (no es la inicialización), refrescar las capas
      if (previousProcessId !== this.currentProcessId && previousProcessId !== null) {
        console.log('[Dashboard] Refrescando elementos del nuevo proceso...');
        this.refreshAllLayers();
      }

      this.cdr.detectChanges();
    });
  }

  /**
   * Verificar si la compañía del usuario tiene roles
   *
   * PROPÓSITO:
   * Determinar si se debe mostrar el banner de creación de roles.
   *
   * FLUJO:
   * 1. Obtener usuario autenticado del AuthService
   * 2. Obtener ID de la compañía
   * 3. Consultar roles de la compañía vía RoleService
   * 4. Actualizar hasRole según el resultado
   *
   * USO:
   * Se llama en ngOnInit para actualizar el estado inicial del banner de roles.
   */
  private checkIfCompanyHasRoles(): void {
    const user = this.authService.getUser();
    const companyId = user?.company?.id ?? (user as any)?.companyId;

    if (companyId) {
      this.roleService.getRolesByCompanyId(companyId).subscribe({
        next: (roles) => {
          this.hasRole = roles.length > 0;
          console.log(`[Dashboard] La compañía tiene ${roles.length} roles`);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[Dashboard] Error al verificar roles:', err);
          this.hasRole = false;
        }
      });
    } else {
      console.warn('[Dashboard] No se pudo obtener el ID de la compañía para verificar roles');
    }
  }

  /**
   * CICLO DE VIDA - ngOnDestroy
   *
   * Limpia las suscripciones para prevenir memory leaks.
   *
   * LIMPIEZA:
   * - processSubscription: Cancela la suscripción al proceso activo
   *
   * NOTA:
   * Las suscripciones a gateways/activities/edges están dentro de métodos
   * privados y se limpian automáticamente cuando el componente se destruye.
   * Solo las suscripciones guardadas en propiedades necesitan unsubscribe manual.
   */
  ngOnDestroy(): void {
    this.processSubscription?.unsubscribe();
  }

  /**
   * GESTIÓN DE PANELES LATERALES
   *
   * Conjunto de métodos toggle para controlar la visibilidad de los paneles
   * laterales de gestión (Process, User, Role) y el menú lateral.
   *
   * EXCLUSIVIDAD:
   * Los paneles Process, User y Role son mutuamente excluyentes.
   * Al abrir uno, se cierran automáticamente los otros dos.
   *
   * INDEPENDENCIA:
   * El inspector lateral (activity/edge/gateway) es independiente y puede
   * coexistir con cualquier panel de gestión.
   */

  /**
   * Toggle: Panel de gestión de roles
   *
   * COMPORTAMIENTO:
   * - Alterna isRolePanelOpen (true ↔ false)
   * - Si User o Process están abiertos, los cierra
   *
   * VINCULACIÓN:
   * Activado desde el HeaderDashboard cuando se hace click en "Roles".
   */
  onToggleRoles(): void {
    this.isRolePanelOpen = !this.isRolePanelOpen;
    if (this.isUserPanelOpen || this.isProcessPanelOpen) {
      this.isUserPanelOpen = false;
      this.isProcessPanelOpen = false;
    }
  }

  /**
   * Toggle: Panel de gestión de procesos
   *
   * COMPORTAMIENTO:
   * - Alterna isProcessPanelOpen (true ↔ false)
   * - Si User o Role están abiertos, los cierra
   *
   * VINCULACIÓN:
   * Activado desde el HeaderDashboard cuando se hace click en "Processes".
   */
  toggleProcessPanel(): void {
    this.isProcessPanelOpen = !this.isProcessPanelOpen;
    if (this.isUserPanelOpen || this.isRolePanelOpen) {
      this.isUserPanelOpen = false;
      this.isRolePanelOpen = false;
    }
  }

  /**
   * Toggle: Panel de gestión de usuarios
   *
   * COMPORTAMIENTO:
   * - Alterna isUserPanelOpen (true ↔ false)
   * - Si Process o Role están abiertos, los cierra
   *
   * VINCULACIÓN:
   * Activado desde el HeaderDashboard cuando se hace click en "Users".
   */
  toggleUserPanel(): void {
    this.isUserPanelOpen = !this.isUserPanelOpen;
    if (this.isProcessPanelOpen || this.isRolePanelOpen) {
      this.isProcessPanelOpen = false;
      this.isRolePanelOpen = false;
    }
  }

  /**
   * Toggle: Sidebar izquierda con menú de componentes
   *
   * COMPORTAMIENTO:
   * - Alterna isSidebarOpen (true ↔ false)
   *
   * EFECTO VISUAL:
   * Muestra/oculta el menú lateral izquierdo con los elementos draggables
   * (gateways, activities, edges).
   *
   * VINCULACIÓN:
   * Activado desde el HeaderDashboard mediante botón de hamburguesa.
   */
  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  /**
   * INTEGRACIÓN CON GATEWAY SERVICE
   *
   * Suscripción reactiva al stream de gateways desde GatewayService.
   * Actualiza automáticamente la capa de gateways cuando el servicio emite cambios.
   */

  /**
   * Suscripción al stream reactivo de gateways
   *
   * PROPÓSITO:
   * Mantener sincronizada la representación visual de gateways con el store del servicio.
   *
   * FLUJO:
   * 1. GatewayService.list$ emite array de gateways
   * 2. Filtrar solo gateways con status 'active' e id definido
   * 3. Convertir cada gateway a BoardComponent
   * 4. Llamar recomputeBoardIncludeCurrentGateways() para actualizar canvas
   *
   * CONVERSIÓN A BOARDCOMPONENT:
   * - id: "gateway-{gatewayId}"
   * - type: tipo del gateway (decision/parallel/exclusive)
   * - category: "gateway"
   * - x, y: coordenadas (default 100, 100 si undefined)
   * - label: etiqueta legible mediante getComponentLabel()
   * - gatewayId: referencia al id original en el servicio
   *
   * ACTUALIZACIÓN DEL CANVAS:
   * recomputeBoardIncludeCurrentGateways() combina la capa de gateways
   * con activitiesLayer y edgesLayer para actualizar boardComponents.
   *
   * LOGS:
   * Imprime en consola los gateways recibidos y los activos filtrados
   * para debugging.
   */
  private subscribeGatewaysStream(): void {
    this.gatewayService.list$.subscribe((gateways: Gateway[]) => {
      console.log('[Dashboard] subscribeGatewaysStream recibió:', gateways);
      console.log('[Dashboard] Proceso activo actual:', this.currentProcessId);

      // DEBUG: Mostrar processId de cada gateway
      gateways.forEach(g => {
        console.log(`[Dashboard] Gateway ${g.id}: status="${g.status}", processId=${g.processId}, type="${g.type}"`);
      });

      // Diferir la actualización para evitar ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(() => {
        // Filtrar por: activos, con ID, y que pertenezcan al proceso activo
        const activeGateways = gateways.filter(g =>
          g.status === 'active' &&
          g.id != null &&
          (this.currentProcessId == null || g.processId === this.currentProcessId)
        );
        console.log('[Dashboard] Gateways del proceso activo:', activeGateways);

        // Convertir a BoardComponents
        const gwLayer: BoardComponent[] = activeGateways.map(g => ({
          id: `gateway-${g.id}`,
          type: g.type,
          category: 'gateway',
          x: g.x ?? 100,
          y: g.y ?? 100,
          label: this.getComponentLabel(g.type),
          gatewayId: g.id,
        }));

        // Reemplazar solo la capa de gateways, mantener activities/edges
        const nonGateways = this.boardComponents.filter(c => c.category !== 'gateway');
        this.boardComponents = [...gwLayer, ...nonGateways];
        console.log('[Dashboard] boardComponents actualizado:', this.boardComponents);
      }, 0);
    });
  }

  /**
   * Actualizar posición de un gateway en el servicio
   *
   * PROPÓSITO:
   * Persistir la nueva posición de un gateway después de moverlo en el canvas.
   *
   * FLUJO:
   * 1. Validar que el componente tenga gatewayId
   * 2. Obtener snapshot actual del gateway desde el servicio
   * 3. Crear gateway actualizado con nuevas coordenadas x, y
   * 4. Enviar update al servicio
   *
   * SINCRONIZACIÓN:
   * El servicio emitirá el cambio vía list$, lo que disparará subscribeGatewaysStream()
   * y actualizará el canvas automáticamente.
   *
   * PARÁMETROS:
   * @param component - BoardComponent con las nuevas coordenadas x, y
   *
   * VALIDACIONES:
   * - Verifica que gatewayId esté presente
   * - Verifica que el gateway exista en el snapshot actual
   *
   * LOGS:
   * Imprime resultado (success) o error en consola.
   */
  updateGatewayPosition(component: BoardComponent): void {
    if (!component.gatewayId) return;

    // Actualizar en el servicio (en memoria)
    const current = this.gatewayService.getCurrentSnapshot().find(g => g.id === component.gatewayId);
    if (current) {
      const updated: Gateway = {
        ...current,
        x: component.x,
        y: component.y,
      };
      this.gatewayService.update(updated).subscribe({
        next: () => console.log('[Dashboard] Gateway position updated'),
        error: (e) => console.error('[Dashboard] Error updating gateway position:', e),
      });
    }
  }

  /**
   * SISTEMA DE DRAG & DROP
   *
   * Maneja dos flujos de drag & drop:
   * 1. Drag desde menú lateral: crea nuevo elemento en el canvas
   * 2. Drag de elemento existente: actualiza su posición
   *
   * COORDINACIÓN:
   * - onBoardDragOver: Previene comportamiento default para permitir drop
   * - onBoardDrop: Maneja el drop y ejecuta la acción correspondiente
   * - onDragStart: Marca elementos existentes vs nuevos
   * - onDragEnd: Limpia flags después del drag
   *
   * CÁLCULO DE COORDENADAS:
   * clientX/Y - rect.left/top - panOffsetX/Y = coordenadas relativas al canvas
   * Luego se resta offset adicional (30px) para centrar el cursor en el elemento.
   */

  /**
   * Handler: Drop en el canvas
   *
   * PROPÓSITO:
   * Procesar el drop de un elemento en el canvas, diferenciando entre
   * mover un elemento existente o crear uno nuevo.
   *
   * FLUJO PARA ELEMENTO EXISTENTE (componentId presente):
   * 1. Calcular nueva posición relativa al canvas
   * 2. Actualizar coordenadas x, y del componente en boardComponents
   * 3. Si es gateway: updateGatewayPosition()
   * 4. Si es activity: updateActivityPosition()
   *
   * FLUJO PARA ELEMENTO NUEVO (componentType presente):
   * 1. Calcular posición de creación
   * 2. addComponentToBoard() para crear elemento
   * 3. Abrir inspector si aplica
   *
   * CÁLCULO DE COORDENADAS:
   * x = event.clientX - rect.left - panOffsetX - 30
   * y = event.clientY - rect.top - panOffsetY - 30
   *
   * OFFSET DE 30px:
   * Centra visualmente el cursor dentro del elemento al dropearlo.
   *
   * DATA TRANSFER:
   * - 'component-id': ID del elemento existente a mover
   * - 'component-type': Tipo del elemento nuevo a crear
   *
   * CATEGORÍAS SOPORTADAS:
   * - gateway: Se actualiza vía updateGatewayPosition()
   * - activity: Se actualiza vía updateActivityPosition()
   * - edge: No tiene representación visual, no se mueve
   */
  onBoardDrop(event: DragEvent): void {
    event.preventDefault();

    const componentId = event.dataTransfer?.getData('component-id');
    if (componentId) {
      // mover existente
      const boardElement = event.currentTarget as HTMLElement;
      const rect = boardElement.getBoundingClientRect();
      const x = event.clientX - rect.left - this.panOffsetX;
      const y = event.clientY - rect.top - this.panOffsetY;

      const component = this.boardComponents.find((c) => c.id === componentId);
      if (component) {
        component.x = x - 30;
        component.y = y - 30;

        if (component.category === 'gateway' && component.gatewayId) {
          this.updateGatewayPosition(component);
        }
        if (component.category === 'activity' && component.activityId != null) {
          this.updateActivityPosition(component);
        }
        if (component.category === 'edge' && component.edgeId != null) {
          this.edgesLayer = this.edgesLayer.map((c) =>
            c.id === component.id ? { ...c, x: component.x, y: component.y } : c
          );
        }
        this.recomputeBoardAfterLocalMove(component);
      }
    } else {
      // agregar nuevo desde el menú
      const componentType = event.dataTransfer?.getData('component-type');
      const componentCategory = event.dataTransfer?.getData('component-category');
      if (componentType && componentCategory) {
        const boardElement = event.currentTarget as HTMLElement;
        const rect = boardElement.getBoundingClientRect();
        const x = event.clientX - rect.left - this.panOffsetX;
        const y = event.clientY - rect.top - this.panOffsetY;

        this.addComponentToBoard(componentType, componentCategory, x, y);

        // abrir inspector al crear Activity por DnD
        if (componentCategory === 'activity') {
          this.openInspector('activity');
        }
      }
    }

    this.isDraggingExisting = false;
  }

  /**
   * Handler: DragOver en el canvas
   *
   * PROPÓSITO:
   * Permitir el drop en el canvas mediante preventDefault().
   *
   * FEEDBACK VISUAL:
   * Cambia el dropEffect según el tipo de drag:
   * - 'move': Cuando se arrastra un elemento existente
   * - 'copy': Cuando se arrastra desde el menú (crear nuevo)
   *
   * EFECTO:
   * El cursor del mouse cambia para indicar la operación (mover vs copiar).
   */
  onBoardDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = this.isDraggingExisting ? 'move' : 'copy';
    }
  }

  /**
   * Handler: Inicio de drag de un componente del canvas
   *
   * PROPÓSITO:
   * Marcar que se está arrastrando un elemento existente y preparar
   * el inspector para mostrar sus datos.
   *
   * FLUJO:
   * 1. Establecer isDraggingExisting = true
   * 2. Configurar effectAllowed = 'move'
   * 3. Guardar component-id en dataTransfer
   * 4. Añadir clase CSS 'dragging' para feedback visual
   * 5. Abrir inspector correspondiente según categoría
   *
   * INSPECTOR:
   * Se abre automáticamente según la categoría:
   * - activity → inspectorKind = 'activity', selectedActivityId
   * - edge → inspectorKind = 'edge', selectedEdgeId
   * - gateway → inspectorKind = 'gateway', selectedGatewayId
   *
   * COMPORTAMIENTO:
   * inspectorOpen = true para mostrar el panel lateral inmediatamente.
   *
   * CLASE CSS:
   * 'dragging' reduce opacidad del elemento durante el drag.
   */
  onComponentDragStart(event: DragEvent, component: BoardComponent): void {
    if (!event.dataTransfer) return;
    this.isDraggingExisting = true;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('component-id', component.id);

    const target = event.target as HTMLElement;
    target.classList.add('dragging');

    // seleccionar para mostrar panel
    if (component.category === 'activity') {
      this.selectedActivityId = component.activityId ?? null;
      this.inspectorKind = 'activity';
      this.inspectorOpen = true;
    } else if (component.category === 'edge') {
      this.selectedEdgeId = component.edgeId ?? null;
      this.inspectorKind = 'edge';
      this.inspectorOpen = true;
    } else if (component.category === 'gateway') {
      this.selectedGatewayId = component.gatewayId ?? null;
      this.inspectorKind = 'gateway';
      this.inspectorOpen = true;
    }
  }

  /**
   * Handler: Fin de drag de un componente
   *
   * PROPÓSITO:
   * Limpiar clase CSS 'dragging' después de soltar el elemento.
   *
   * EFECTO:
   * Restaura la opacidad normal del elemento.
   *
   * NOTA:
   * isDraggingExisting se resetea en onBoardDrop, no aquí.
   */
  onComponentDragEnd(event: DragEvent): void {
    const target = event.target as HTMLElement;
    target.classList.remove('dragging');
    this.isDraggingExisting = false;
  }

  /**
   * CREACIÓN DE COMPONENTES
   *
   * Sistema para agregar nuevos elementos al canvas y persistirlos
   * en sus respectivos servicios.
   */

  /**
   * Agregar nuevo componente al canvas
   *
   * PROPÓSITO:
   * Crear un nuevo elemento (gateway o activity) en el canvas y persistirlo
   * en el servicio correspondiente.
   *
   * FLUJO GENERAL:
   * 1. Validar categoría (edges no crean visual, solo abren inspector)
   * 2. Generar ID temporal único
   * 3. Crear BoardComponent con datos básicos
   * 4. Agregar al canvas inmediatamente (optimistic UI)
   * 5. Llamar servicio.create() para persistir
   * 6. Actualizar ID temporal con ID real del backend
   *
   * CASO ESPECIAL - EDGES:
   * Los edges NO tienen representación visual en el canvas (no aparecen como círculo).
   * Solo existen para calcular las líneas SVG entre nodos.
   * Por eso, si category === 'edge', solo se abre el inspector sin crear visual.
   *
   * FLUJO PARA GATEWAYS:
   * 1. Crear BoardComponent temporal
   * 2. Agregarlo a boardComponents (visual inmediato)
   * 3. Crear objeto Gateway con type, status, x, y
   * 4. Llamar gatewayService.create()
   * 5. En success: actualizar tempId con ID real y gatewayId
   * 6. Disparar detectChanges()
   *
   * FLUJO PARA ACTIVITIES:
   * 1. Crear BoardComponent temporal
   * 2. Agregarlo a boardComponents (visual inmediato)
   * 3. Crear objeto Activity con name, description, x, y, width, height, status
   * 4. Intentar llamar activityService.create/add/new (duck typing)
   * 5. La actualización del ID se gestiona vía subscribeActivitiesStream()
   *
   * DUCK TYPING EN ACTIVITIES:
   * Se prueba create(), add() o new() porque ActivityService puede
   * usar nombres diferentes según la implementación.
   *
   * ID TEMPORAL:
   * Formato: "temp-{timestamp}-{random}"
   * Se reemplaza por "gateway-{id}" o "activity-{id}" al recibir respuesta.
   *
   * OPTIMISTIC UI:
   * El elemento aparece inmediatamente en el canvas antes de la respuesta
   * del servicio, mejorando la UX.
   *
   * PARÁMETROS:
   * @param type - Tipo específico (decision-gateway, task-user, etc)
   * @param category - Categoría general (gateway | activity | edge)
   * @param x - Coordenada X en el canvas
   * @param y - Coordenada Y en el canvas
   *
   * OFFSET:
   * Se resta 30px a x, y para centrar el elemento bajo el cursor.
   */
  addComponentToBoard(type: string, category: string, x: number, y: number): void {
    // IMPORTANTE: los Edges NO crean nodo visual (evita “pelotica”).
    // Se crean/editarán solo desde el panel.
    if (category === 'edge') {
      this.openInspector('edge');
      return;
    }

    // visual inmediato SOLO si hay proceso activo
    if (this.currentProcessId == null) {
      console.error('[Dashboard] No hay proceso activo. No se puede crear elemento.');
      alert('⚠️ Error: Debes seleccionar un proceso antes de crear elementos.\n\nUsa "My Processes" en el menú superior.');
      return; // NO agregar a boardComponents
    }

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const newComponent: BoardComponent = {
      id: tempId,
      type,
      category,
      x: x - 30,
      y: y - 30,
      label: this.getComponentLabel(type),
    };

    this.boardComponents.push(newComponent);

    if (category === 'gateway') {
      const gateway: Gateway = {
        type,
        status: 'active',
        x: newComponent.x,
        y: newComponent.y,
        processId: this.currentProcessId, // ✅ ASIGNAR PROCESO ACTIVO
      };

      console.log('[Dashboard] Creando gateway con processId:', this.currentProcessId);

      this.gatewayService.create(gateway).subscribe({
        next: (saved: Gateway) => {
          const comp = this.boardComponents.find((c) => c.id === tempId);
          if (comp && saved.id) {
            comp.gatewayId = saved.id;
            comp.id = `gateway-${saved.id}`;
          }
          console.log('[Dashboard] Gateway creado exitosamente:', saved);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[Dashboard] Error al crear gateway:', err);
          // Remover el componente temporal en caso de error
          this.boardComponents = this.boardComponents.filter(c => c.id !== tempId);
          this.cdr.detectChanges();
        },
      });
      return;
    }

    if (category === 'activity') {

      const a: Activity = {
        name: 'Activity',
        description: '',
        x: newComponent.x,
        y: newComponent.y,
        width: 100,
        height: 60,
        status: 'active',
        processId: this.currentProcessId, // ✅ ASIGNAR PROCESO ACTIVO
      };

      console.log('[Dashboard] Creando activity con processId:', this.currentProcessId);

      this.activityService.create(a).subscribe({
        next: (saved: Activity) => {
          const comp = this.boardComponents.find((c) => c.id === tempId);
          if (comp && saved.id) {
            comp.activityId = saved.id;
            comp.id = `activity-${saved.id}`;
          }
          console.log('[Dashboard] Activity creado exitosamente:', saved);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[Dashboard] Error al crear activity:', err);
          // Remover el componente temporal en caso de error
          this.boardComponents = this.boardComponents.filter(c => c.id !== tempId);
          this.cdr.detectChanges();
        },
      });
      return;
    }
  }

  /**
   * Handler: Selección de elemento desde el menú lateral
   *
   * PROPÓSITO:
   * Responder al click en el menú lateral de componentes draggables.
   *
   * COMPORTAMIENTO:
   * - Si es edge: solo abrir inspector (edges no tienen visual en canvas)
   * - Si es otro: crear en posición default (400, 300) y abrir inspector si es activity
   *
   * CASO ESPECIAL - EDGES:
   * Los edges se crean exclusivamente desde el EdgePanel mediante selectores
   * de origen/destino. No se dropean en el canvas ni tienen posición visual.
   *
   * POSICIÓN DEFAULT:
   * x=400, y=300 cuando se crea desde menú (sin drag & drop).
   *
   * INSPECTOR:
   * Solo se abre automáticamente para activities. Los gateways no lo necesitan
   * porque tienen valores default válidos.
   *
   * PARÁMETROS:
   * @param data - Objeto con type (decision-gateway, task-user) y category (gateway/activity/edge)
   */
  onComponentSelected(data: { type: string; category: string }): void {
    // Si eligen "edge" desde el menú: NO crear nada visual; solo abrir panel.
    if (data.category === 'edge') {
      this.openInspector('edge');
      return;
    }
    // Crear en el origen (0, 0) por defecto
    this.addComponentToBoard(data.type, data.category, 0, 0);
    if (data.category === 'activity') this.openInspector('activity');
  }

  /**
   * ELIMINACIÓN DE COMPONENTES
   *
   * Sistema para eliminar elementos del canvas y del servicio correspondiente.
   */

  /**
   * Eliminar componente del canvas y del servicio
   *
   * PROPÓSITO:
   * Borrar un elemento (gateway, activity o edge) del canvas y del store del servicio.
   *
   * FLUJO PARA GATEWAYS:
   * 1. Validar que tenga gatewayId y category === 'gateway'
   * 2. Llamar gatewayService.delete(gatewayId)
   * 3. En success: filtrar de boardComponents
   * 4. Disparar detectChanges()
   * 5. Log de éxito
   *
   * FLUJO PARA ACTIVITIES:
   * 1. Validar que tenga activityId y category === 'activity'
   * 2. Llamar activityService.delete(activityId)
   * 3. La eliminación visual se gestiona automáticamente vía subscribeActivitiesStream()
   * 4. Log de éxito
   *
   * FLUJO PARA EDGES:
   * 1. Validar que tenga edgeId y category === 'edge'
   * 2. Llamar edgeService.delete(edgeId)
   * 3. La eliminación visual se gestiona automáticamente vía subscribeEdgesStream()
   * 4. Log de éxito
   *
   * SINCRONIZACIÓN:
   * Para activities y edges, la eliminación visual es automática gracias
   * a las suscripciones reactivas. Para gateways se hace manual por
   * consistencia con el resto del código.
   *
   * PARÁMETROS:
   * @param id - ID del BoardComponent a eliminar (ej: "gateway-5", "activity-12")
   *
   * LOGS:
   * Imprime en consola el éxito o error de cada operación.
   */
  removeComponent(id: string): void {
    const component = this.boardComponents.find((c) => c.id === id);

    if (component?.gatewayId && component.category === 'gateway') {
      this.gatewayService.delete(component.gatewayId).subscribe({
        next: () => {
          this.boardComponents = this.boardComponents.filter((c) => c.id !== id);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[Dashboard] Error al eliminar gateway:', error);
          this.boardComponents = this.boardComponents.filter((c) => c.id !== id);
        },
      });
      return;
    }

    if (component?.category === 'activity' && component.activityId != null) {
      this.activityService.delete(component.activityId).subscribe({
        next: () => {
          console.log('[Dashboard] Activity eliminado exitosamente:', component.activityId);
          this.boardComponents = this.boardComponents.filter((c) => c.id !== id);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[Dashboard] Error al eliminar activity:', error);
          this.boardComponents = this.boardComponents.filter((c) => c.id !== id);
        },
      });
      return;
    }

    if (component?.category === 'edge' && component.edgeId != null) {
      this.edgeService.delete(component.edgeId).subscribe({
        next: () => {
          console.log('[Dashboard] Edge eliminado exitosamente:', component.edgeId);
          this.boardComponents = this.boardComponents.filter((c) => c.id !== id);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[Dashboard] Error al eliminar edge:', error);
          this.boardComponents = this.boardComponents.filter((c) => c.id !== id);
        },
      });
      return;
    }

    // Si no es ninguna categoría conocida, simplemente remover del boardComponents
    this.boardComponents = this.boardComponents.filter((c) => c.id !== id);
  }

  /**
   * GESTIÓN DEL INSPECTOR LATERAL
   *
   * Métodos para controlar el panel inspector contextual que muestra
   * los formularios CRUD de activity/edge/gateway.
   */

  /**
   * Abrir inspector lateral
   *
   * PROPÓSITO:
   * Mostrar el panel lateral con el formulario correspondiente al tipo de elemento.
   *
   * COMPORTAMIENTO:
   * 1. Establecer inspectorKind (activity | edge | gateway)
   * 2. Establecer inspectorOpen = true
   * 3. Si se proporciona component, cargar sus IDs en selectedXxxId
   *
   * MODOS DE USO:
   * - Sin component: Crear nuevo elemento (IDs en null)
   * - Con component: Editar elemento existente (carga IDs)
   *
   * ASIGNACIÓN DE IDs:
   * - kind === 'activity' → selectedActivityId = component.activityId
   * - kind === 'edge' → selectedEdgeId = component.edgeId
   * - kind === 'gateway' → selectedGatewayId = component.gatewayId
   *
   * PANELES MOSTRADOS:
   * - 'activity' → ActivityPanel con reactive form
   * - 'edge' → EdgePanel con selectores mixtos
   * - 'gateway' → GatewayPanel con selector de tipos
   *
   * PARÁMETROS:
   * @param kind - Tipo de inspector a mostrar
   * @param component - (Opcional) Componente a editar
   */
  openInspector(kind: 'activity' | 'edge' | 'gateway', component?: BoardComponent): void {
    this.inspectorKind = kind;
    this.inspectorOpen = true;
    if (component) {
      if (kind === 'activity') this.selectedActivityId = component.activityId ?? null;
      if (kind === 'edge') this.selectedEdgeId = component.edgeId ?? null;
      if (kind === 'gateway') this.selectedGatewayId = component.gatewayId ?? null;
    }
  }

  /**
   * Cerrar inspector lateral
   *
   * PROPÓSITO:
   * Ocultar el panel inspector y resetear todos los estados de selección.
   *
   * LIMPIEZA:
   * - inspectorOpen = false: Oculta el panel
   * - inspectorKind = null: Limpia el tipo de inspector
   * - selectedActivityId = null: Limpia selección de activity
   * - selectedEdgeId = null: Limpia selección de edge
   * - selectedGatewayId = null: Limpia selección de gateway
   *
   * USO:
   * Se llama cuando el usuario cierra manualmente el inspector o cuando
   * se completa una operación CRUD.
   */
  closeInspector(): void {
    this.inspectorOpen = false;
    this.inspectorKind = null;
    this.selectedActivityId = null;
    this.selectedEdgeId = null;
    this.selectedGatewayId = null;
  }

  /**
   * HELPERS PARA CÁLCULO DE COORDENADAS SVG
   *
   * Conjunto de métodos auxiliares para calcular posiciones de endpoints
   * y centros de nodos para dibujar las líneas de conexión entre elementos.
   */

  /**
   * Resolver endpoint de un edge
   *
   * PROPÓSITO:
   * Encontrar el BoardComponent correspondiente al nodo origen o destino de un edge,
   * soportando tanto formato tipado (fromType/fromId) como legado (activitySourceId).
   *
   * ESTRATEGIA DE RESOLUCIÓN:
   * 1. Obtener tipo del endpoint: fromType/toType con fallback a 'activity'
   * 2. Obtener ID del endpoint: fromId/toId con fallback a activitySourceId/activityDestinyId
   * 3. Validar que el ID no sea null
   * 4. Buscar en boardComponents según categoría e ID interno
   *
   * SOPORTE DUAL FORMAT:
   * - FORMATO TIPADO: fromType='gateway', fromId=5 → busca gateway con gatewayId=5
   * - FORMATO TIPADO: fromType='activity', fromId=12 → busca activity con activityId=12
   * - FORMATO LEGADO: sin fromType, activitySourceId=12 → asume activity con activityId=12
   *
   * BÚSQUEDA:
   * - Si type === 'activity': busca en boardComponents donde category='activity' y activityId=id
   * - Si type === 'gateway': busca en boardComponents donde category='gateway' y gatewayId=id
   *
   * PARÁMETROS:
   * @param edge - Edge con campos fromType/fromId/toType/toId o activitySourceId/activityDestinyId
   * @param which - 'from' para origen, 'to' para destino
   *
   * RETORNO:
   * - { comp: BoardComponent, category: 'activity'|'gateway' } si se encuentra el nodo
   * - null si no se encuentra o el ID es null
   *
   * USO:
   * Se utiliza en edgeCoordsByComponent() para calcular las coordenadas de las líneas SVG.
   */
  private resolveEndpoint(
    edge: Edge,
    which: 'from' | 'to'
  ):
    | { comp: BoardComponent; category: 'activity' | 'gateway' }
    | null {
    // 1) Tomar tipo+id desde el edge (tipado) con fallback a legado activity
    const type = (which === 'from' ? edge.fromType : edge.toType) ?? 'activity';
    const id =
      which === 'from'
        ? edge.fromId ?? (edge as any).activitySourceId ?? null
        : edge.toId ?? (edge as any).activityDestinyId ?? null;

    if (id == null) return null;

    // 2) Buscar el componente en el canvas por categoría e id interno
    if (type === 'activity') {
      const comp = this.boardComponents.find(
        (c) => c.category === 'activity' && c.activityId === id
      );
      return comp ? { comp, category: 'activity' } : null;
    } else {
      const comp = this.boardComponents.find(
        (c) => c.category === 'gateway' && c.gatewayId === id
      );
      return comp ? { comp, category: 'gateway' } : null;
    }
  }

  /**
   * Calcular centro geométrico de un nodo
   *
   * PROPÓSITO:
   * Obtener las coordenadas del punto central de un nodo (activity o gateway)
   * para dibujar las líneas de conexión desde/hacia ese punto.
   *
   * TAMAÑOS ESTÁNDAR:
   * - Activity: 100px × 60px (rectángulo horizontal)
   * - Gateway: 80px × 80px (rombo/cuadrado)
   *
   * USO DE DIMENSIONES:
   * - Prioriza width/height del componente si están definidos
   * - Fallback a tamaños estándar según categoría
   *
   * CÁLCULO:
   * cx = comp.x + width/2
   * cy = comp.y + height/2
   *
   * COORDENADAS:
   * Las coordenadas x, y del componente representan su esquina superior izquierda.
   * El centro se calcula sumando la mitad del ancho/alto.
   *
   * PARÁMETROS:
   * @param comp - BoardComponent con coordenadas x, y y dimensiones opcionales
   * @param category - 'activity' o 'gateway' para determinar tamaño default
   *
   * RETORNO:
   * Objeto con { cx, cy } representando el centro absoluto en el canvas.
   *
   * USO:
   * Se llama desde edgeCoordsByComponent() para calcular x1, y1, x2, y2
   * de las líneas SVG.
   */
  private getCenterForNode(
    comp: BoardComponent,
    category: 'activity' | 'gateway'
  ): { cx: number; cy: number } {
    const defaultW = category === 'activity' ? 100 : 80;
    const defaultH = category === 'activity' ? 60 : 80;

    const w = comp.width ?? defaultW;
    const h = comp.height ?? defaultH;

    return { cx: comp.x + w / 2, cy: comp.y + h / 2 };
  }

  /**
   * Getter: Lista de componentes que son edges
   *
   * PROPÓSITO:
   * Proporcionar un array filtrado solo con edges para el *ngFor del SVG.
   *
   * OPTIMIZACIÓN:
   * Evita filtrar en el template en cada ciclo de detección de cambios.
   * Angular llamará este getter cuando detecte cambios en boardComponents.
   *
   * USO EN TEMPLATE:
   * <svg>
   *   <line *ngFor="let edge of edgeComponents; trackBy: trackByEdge" ...>
   * </svg>
   *
   * RETORNO:
   * Array de BoardComponents donde category === 'edge'.
   */
  get edgeComponents(): BoardComponent[] {
    // Evita filtrar en el template en cada detección de cambios
    return this.boardComponents.filter(c => c.category === 'edge');
  }

  /**
   * TrackBy function: Para todos los componentes del canvas
   *
   * PROPÓSITO:
   * Optimizar *ngFor permitiendo a Angular rastrear elementos por ID único
   * en lugar de por referencia de objeto.
   *
   * BENEFICIO:
   * Angular no recrea elementos HTML innecesariamente cuando cambia
   * el orden o se agregan/eliminan elementos.
   *
   * USO:
   * <div *ngFor="let comp of boardComponents; trackBy: trackByComponent">
   *
   * RETORNO:
   * ID único del componente (ej: "gateway-5", "activity-12").
   */
  trackByComponent = (_: number, c: BoardComponent) => c.id;

  /**
   * TrackBy function: Específico para edges en el SVG
   *
   * PROPÓSITO:
   * Optimizar *ngFor de las líneas SVG (edges).
   *
   * IMPLEMENTACIÓN:
   * Idéntica a trackByComponent, pero se mantiene separada por claridad
   * y posible extensión futura.
   *
   * USO:
   * <line *ngFor="let edge of edgeComponents; trackBy: trackByEdge">
   *
   * RETORNO:
   * ID único del edge (ej: "edge-3").
   */
  trackByEdge = (_: number, c: BoardComponent) => c.id;

  /**
   * CÁLCULO DE COORDENADAS SVG PARA EDGES
   *
   * Sistema para calcular las coordenadas de las líneas que conectan nodos.
   */

  /**
   * Calcular coordenadas de línea SVG para un edge
   *
   * PROPÓSITO:
   * Obtener las coordenadas (x1, y1, x2, y2) de la línea que conecta
   * el nodo origen con el nodo destino de un edge.
   *
   * FLUJO:
   * 1. Validar que el componente sea category === 'edge'
   * 2. Buscar el Edge real en edgesCache por edgeId
   * 3. Aplicar fallback de IDs si el cache está vacío (compat con edgesLayer)
   * 4. Resolver endpoint origen vía resolveEndpoint(edge, 'from')
   * 5. Resolver endpoint destino vía resolveEndpoint(edge, 'to')
   * 6. Calcular centros de ambos nodos vía getCenterForNode()
   * 7. Retornar coordenadas { x1: cx_from, y1: cy_from, x2: cx_to, y2: cy_to }
   *
   * FALLBACK DE IDs:
   * Si el edge no está en edgesCache, usa los IDs del BoardComponent
   * (fromId/toId o activitySourceId/activityDestinyId) para compatibilidad.
   *
   * VALIDACIÓN:
   * Retorna null si:
   * - El componente no es un edge
   * - No se puede resolver el nodo origen
   * - No se puede resolver el nodo destino
   *
   * COORDENADAS:
   * Las coordenadas son absolutas en el canvas (incluyen el pan offset
   * porque el SVG se transforma junto con el contenedor).
   *
   * PARÁMETROS:
   * @param edgeCmp - BoardComponent de categoría 'edge'
   *
   * RETORNO:
   * - { x1, y1, x2, y2 } con coordenadas de la línea
   * - null si no se puede calcular
   *
   * USO EN TEMPLATE:
   * <line [attr.x1]="coords?.x1" [attr.y1]="coords?.y1" ...>
   * donde coords = edgeCoordsByComponent(edge)
   */
  edgeCoordsByComponent(edgeCmp: BoardComponent): { x1: number; y1: number; x2: number; y2: number } | null {
    if (edgeCmp.category !== 'edge') return null;

    // 1) Ubicar el Edge real por id para leer tipos/ids tipados (o usar fallback desde el cmp)
    const edge = this.edgesCache.find((e) => e.id === edgeCmp.edgeId) ?? ({} as Edge);

    // Fallback de ids si el cache no lo encontró (compat con tu edgesLayer actual)
    if ((edge as any).fromId == null && (edge as any).activitySourceId == null) {
      (edge as any).fromId = edgeCmp.fromId ?? (edge as any).activitySourceId;
    }
    if ((edge as any).toId == null && (edge as any).activityDestinyId == null) {
      (edge as any).toId = edgeCmp.toId ?? (edge as any).activityDestinyId;
    }

    // 2) Resolver extremos por tipo (con fallback a 'activity' si no hay tipo)
    const fromResolved = this.resolveEndpoint(edge, 'from');
    const toResolved   = this.resolveEndpoint(edge, 'to');

    if (!fromResolved || !toResolved) return null;

    // 3) Calcular centros según categoría y dimensiones acordadas
    const { cx: x1, cy: y1 } = this.getCenterForNode(fromResolved.comp, fromResolved.category);
    const { cx: x2, cy: y2 } = this.getCenterForNode(toResolved.comp, toResolved.category);

    // IMPORTANTE: no restar pan; el SVG viaja dentro de .board-canvas con el mismo transform
    return { x1, y1, x2, y2 };
  }

  /**
   * SUSCRIPCIONES A STREAMS DE SERVICIOS
   *
   * Sistema de sincronización reactiva con los stores de ActivityService y EdgeService.
   * Actualiza automáticamente las capas del canvas cuando los servicios emiten cambios.
   */

  /**
   * Suscripción al stream reactivo de activities
   *
   * PROPÓSITO:
   * Mantener sincronizada la capa de activities del canvas con el store del servicio.
   *
   * DUCK TYPING AVANZADO:
   * Busca el stream en múltiples propiedades posibles del servicio:
   * - items$ (BehaviorSubject asObservable)
   * - list$ (Observable directo)
   * - items.asObservable() (BehaviorSubject directo)
   * - list() (método que retorna Observable)
   * - getAll() (método que retorna Observable)
   * - getActivities() (método que retorna Observable)
   *
   * FLUJO:
   * 1. Intentar encontrar stream mediante duck typing
   * 2. Suscribirse al stream
   * 3. Actualizar activitiesCache con datos recibidos
   * 4. Filtrar activities con status 'active'
   * 5. Convertir a BoardComponents
   * 6. Actualizar activitiesLayer
   * 7. Detectar nuevos IDs (comparar con seenActivityIds)
   * 8. Si hay nuevo ID y el inspector está en modo activity, actualizar selectedActivityId
   * 9. Llamar recomputeBoardIncludeCurrentGateways() para actualizar canvas
   *
   * CONVERSIÓN A BOARDCOMPONENT:
   * - id: "activity-{activityId}"
   * - type: type del activity (task-user, event-start, etc)
   * - category: "activity"
   * - x, y: coordenadas (default 100, 100 si undefined)
   * - width, height: dimensiones (default 100, 60 si undefined)
   * - label: name del activity
   * - activityId: referencia al id original
   *
   * DETECCIÓN DE NUEVOS ELEMENTOS:
   * Compara IDs actuales con seenActivityIds. Si encuentra uno nuevo y el
   * inspector está abierto en modo activity, lo selecciona automáticamente
   * para mostrarlo en el formulario.
   *
   * RECOMPUTE:
   * recomputeBoardIncludeCurrentGateways() combina todas las capas
   * (gateways + activitiesLayer + edgesLayer) en boardComponents.
   *
   * FALLBACK:
   * Si no encuentra ningún stream, imprime warning en consola.
   *
   * SINCRONIZACIÓN AUTOMÁTICA:
   * No necesita llamadas manuales a cargar datos. El servicio emite
   * automáticamente cuando hay cambios (create, update, delete).
   */
  private subscribeActivitiesStream(): void {
    const svc: any = this.activityService as any;

    const stream =
      svc.items$ ??
      svc.list$ ??
      (svc.items && typeof svc.items.asObservable === 'function' ? svc.items.asObservable() : undefined) ??
      (typeof svc.list === 'function' ? svc.list() : undefined) ??
      (typeof svc.getAll === 'function' ? svc.getAll() : undefined) ??
      (typeof svc.getActivities === 'function' ? svc.getActivities() : undefined);

    if (stream && typeof stream.subscribe === 'function') {
      stream.subscribe((acts: Activity[] = []) => {
        console.log('[Dashboard] subscribeActivitiesStream recibió:', acts);
        console.log('[Dashboard] Proceso activo actual:', this.currentProcessId);

        // Diferir la actualización para evitar ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          // Filtrar por proceso activo
          const filteredActivities = this.currentProcessId != null
            ? acts.filter(a => a.processId === this.currentProcessId)
            : acts;

          console.log('[Dashboard] Activities del proceso activo:', filteredActivities);

          this.activitiesCache = filteredActivities ?? [];
          this.activitiesLayer = this.activitiesCache.map((a) => ({
            id: `activity-${a.id ?? `local-${this.hash()}`}`,
            type: 'task-user',
            category: 'activity',
            x: a.x ?? 0,
            y: a.y ?? 0,
            width: a.width ?? 100,
            height: a.height ?? 60,
            label: a.name ?? 'Activity',
            activityId: a.id,
          }));

          const ids = this.activitiesCache.map((a) => a.id).filter((id): id is number => id != null);
          const newId = ids.find((id) => !this.seenActivityIds.has(id));
          this.seenActivityIds = new Set(ids);
          if (newId != null && this.inspectorOpen && this.inspectorKind === 'activity') {
            this.selectedActivityId = newId;
          }

          this.recomputeBoardIncludeCurrentGateways();
        }, 0);
      });
    } else {
      console.warn('[Dashboard] No encontré stream de Activities. ¿items$ / list() / getAll() / getActivities()?');
    }
  }

  /**
   * Suscripción al stream reactivo de edges
   *
   * PROPÓSITO:
   * Mantener sincronizada la capa de edges del canvas con el store del servicio.
   *
   * DUCK TYPING AVANZADO:
   * Busca el stream en múltiples propiedades posibles del servicio:
   * - items$ (BehaviorSubject asObservable)
   * - list$ (Observable directo)
   * - items.asObservable() (BehaviorSubject directo)
   * - list() (método que retorna Observable)
   * - getAll() (método que retorna Observable)
   * - getEdges() (método que retorna Observable)
   *
   * FLUJO:
   * 1. Intentar encontrar stream mediante duck typing
   * 2. Suscribirse al stream
   * 3. Actualizar edgesCache con datos recibidos
   * 4. Convertir a BoardComponents
   * 5. Actualizar edgesLayer
   * 6. Detectar nuevos IDs (comparar con seenEdgeIds)
   * 7. Si hay nuevo ID y el inspector está en modo edge, actualizar selectedEdgeId
   * 8. Llamar recomputeBoardIncludeCurrentGateways() para actualizar canvas
   *
   * CONVERSIÓN A BOARDCOMPONENT:
   * - id: "edge-{edgeId}" o "edge-local-{hash}" si no hay ID
   * - type: "edge-line" (distinto a otros para evitar dibujar círculo)
   * - category: "edge"
   * - x, y: 0, 0 (no se usan, edges no tienen posición visual)
   * - label: label del edge o "Edge" por default
   * - edgeId: referencia al id original
   * - fromId: ID del nodo origen (con fallback a activitySourceId)
   * - toId: ID del nodo destino (con fallback a activityDestinyId)
   *
   * IMPORTANTE - NO VISUAL:
   * Los edges NO dibujan "pelotica verde" ni elemento HTML.
   * Solo existen como entrada en boardComponents para que
   * edgeCoordsByComponent() pueda calcular las líneas SVG.
   * El type 'edge-line' diferencia de 'event-start' para evitar
   * que el template HTML dibuje círculo.
   *
   * SOPORTE DUAL FORMAT:
   * Extrae IDs de origen/destino soportando tanto:
   * - Formato tipado: fromId/toId
   * - Formato legado: activitySourceId/activityDestinyId
   *
   * DETECCIÓN DE NUEVOS ELEMENTOS:
   * Compara IDs actuales con seenEdgeIds. Si encuentra uno nuevo y el
   * inspector está abierto en modo edge, lo selecciona automáticamente.
   *
   * ID LOCAL:
   * Si el edge no tiene ID (creación pendiente), usa hash() para generar
   * un identificador temporal único.
   *
   * RECOMPUTE:
   * recomputeBoardIncludeCurrentGateways() combina todas las capas
   * en boardComponents para actualizar el canvas.
   *
   * FALLBACK:
   * Si no encuentra ningún stream, imprime warning en consola.
   */
  private subscribeEdgesStream(): void {
    const svc: any = this.edgeService as any;

    const stream =
      svc.items$ ??
      svc.list$ ??
      (svc.items && typeof svc.items.asObservable === 'function' ? svc.items.asObservable() : undefined) ??
      (typeof svc.list === 'function' ? svc.list() : undefined) ??
      (typeof svc.getAll === 'function' ? svc.getAll() : undefined) ??
      (typeof svc.getEdges === 'function' ? svc.getEdges() : undefined);

    if (stream && typeof stream.subscribe === 'function') {
      stream.subscribe((eds: Edge[] = []) => {
        console.log('[Dashboard] subscribeEdgesStream recibió:', eds);
        console.log('[Dashboard] Proceso activo actual:', this.currentProcessId);

        // Diferir la actualización para evitar ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          // Filtrar por proceso activo
          const filteredEdges = this.currentProcessId != null
            ? eds.filter(e => e.processId === this.currentProcessId)
            : eds;

          console.log('[Dashboard] Edges del proceso activo:', filteredEdges);

          this.edgesCache = filteredEdges ?? [];

          // NO dibujar "pelotica verde": solo una entrada para que el SVG trace la línea.
          this.edgesLayer = this.edgesCache.map((e) => {
            const src = (e as any).activitySourceId ?? (e as any).fromId;
            const dst = (e as any).activityDestinyId ?? (e as any).toId;
            return {
              id: `edge-${e.id ?? `local-${this.hash()}`}`,
              type: 'edge-line',
              category: 'edge',
              x: 0,
              y: 0,
              label: e.label ?? 'Edge',
              edgeId: e.id,
              fromId: src,
              toId: dst,
            };
          });

          const ids = this.edgesCache.map((e) => e.id).filter((id): id is number => id != null);
          const newId = ids.find((id) => !this.seenEdgeIds.has(id));
          this.seenEdgeIds = new Set(ids);
          if (newId != null && this.inspectorOpen && this.inspectorKind === 'edge') {
            this.selectedEdgeId = newId;
          }

          this.recomputeBoardIncludeCurrentGateways();
        }, 0);
      });
    } else {
      console.warn('[Dashboard] No encontré stream de Edges. ¿items$ / list() / getAll() / getEdges()?');
    }
  }

  /**
   * MÉTODOS AUXILIARES DE ACTUALIZACIÓN Y RECOMPUTE
   *
   * Conjunto de helpers para actualizar posiciones de elementos y recalcular
   * el array unificado boardComponents que se renderiza en el canvas.
   */

  /**
   * Refrescar todas las capas con el proceso activo actual.
   *
   * PROPÓSITO:
   * Forzar el refiltrado de gateways, activities y edges cuando cambia el proceso activo.
   *
   * FLUJO:
   * 1. Obtener snapshots actuales de los tres servicios
   * 2. Filtrar por currentProcessId
   * 3. Regenerar las tres capas (gateways, activities, edges)
   * 4. Recomputar boardComponents
   *
   * USO:
   * Se llama desde ngOnInit cuando detecta que currentProcessId cambió
   * para actualizar inmediatamente el canvas con los elementos del nuevo proceso.
   */
  private refreshAllLayers(): void {
    // Gateways
    const allGateways = this.gatewayService.getCurrentSnapshot();
    const activeGateways = allGateways.filter(g =>
      g.status === 'active' &&
      g.id != null &&
      (this.currentProcessId == null || g.processId === this.currentProcessId)
    );
    const gwLayer: BoardComponent[] = activeGateways.map(g => ({
      id: `gateway-${g.id}`,
      type: g.type,
      category: 'gateway',
      x: g.x ?? 100,
      y: g.y ?? 100,
      label: this.getComponentLabel(g.type),
      gatewayId: g.id,
    }));

    // Activities
    const svcActivity: any = this.activityService as any;
    let allActivities: Activity[] = [];
    if (typeof svcActivity.getCurrentSnapshot === 'function') {
      allActivities = svcActivity.getCurrentSnapshot();
    } else if (svcActivity.store && typeof svcActivity.store.value !== 'undefined') {
      allActivities = svcActivity.store.value;
    }

    const filteredActivities = this.currentProcessId != null
      ? allActivities.filter(a => a.processId === this.currentProcessId)
      : allActivities;

    this.activitiesCache = filteredActivities;
    this.activitiesLayer = this.activitiesCache.map((a) => ({
      id: `activity-${a.id ?? `local-${this.hash()}`}`,
      type: 'task-user',
      category: 'activity',
      x: a.x ?? 0,
      y: a.y ?? 0,
      width: a.width ?? 100,
      height: a.height ?? 60,
      label: a.name ?? 'Activity',
      activityId: a.id,
    }));

    // Edges
    const svcEdge: any = this.edgeService as any;
    let allEdges: Edge[] = [];
    if (typeof svcEdge.getCurrentSnapshot === 'function') {
      allEdges = svcEdge.getCurrentSnapshot();
    } else if (svcEdge.store && typeof svcEdge.store.value !== 'undefined') {
      allEdges = svcEdge.store.value;
    }

    const filteredEdges = this.currentProcessId != null
      ? allEdges.filter(e => e.processId === this.currentProcessId)
      : allEdges;

    this.edgesCache = filteredEdges;
    this.edgesLayer = this.edgesCache.map((e) => {
      const src = (e as any).activitySourceId ?? (e as any).fromId;
      const dst = (e as any).activityDestinyId ?? (e as any).toId;
      return {
        id: `edge-${e.id ?? `local-${this.hash()}`}`,
        type: 'edge-line',
        category: 'edge',
        x: 0,
        y: 0,
        label: e.label ?? 'Edge',
        edgeId: e.id,
        fromId: src,
        toId: dst,
      };
    });

    // Recomputar board
    this.boardComponents = [...gwLayer, ...this.activitiesLayer, ...this.edgesLayer];
    console.log('[Dashboard] Capas refrescadas:', this.boardComponents);
    this.cdr.detectChanges();
  }

  /**
   * MÉTODOS AUXILIARES DE ACTUALIZACIÓN Y RECOMPUTE
   *
   * Conjunto de helpers para actualizar posiciones de elementos y recalcular
   * el array unificado boardComponents que se renderiza en el canvas.
   */

  /**
   * Actualizar posición de una activity en el servicio
   *
   * PROPÓSITO:
   * Persistir la nueva posición de una activity después de moverla en el canvas.
   *
   * FLUJO:
   * 1. Validar category === 'activity' y activityId presente
   * 2. Buscar activity actual en activitiesCache
   * 3. Crear objeto Activity actualizado con nuevas coordenadas x, y
   * 4. Preservar width, height, status (con defaults si no existen)
   * 5. Enviar update al servicio mediante duck typing
   *
   * DUCK TYPING:
   * Intenta llamar métodos en orden: update(), save(), put(), set()
   * Esto permite compatibilidad con diferentes implementaciones del servicio.
   *
   * CONSTRUCCIÓN DEL OBJETO:
   * - Spread del activity actual si existe
   * - Fallback con defaults si no está en cache: id, name, description
   * - Coordenadas: x, y del componente (nuevas)
   * - Dimensiones: width, height del cache o defaults (100, 60)
   * - Status: status del cache o default 'active'
   *
   * SINCRONIZACIÓN:
   * El servicio emitirá el cambio vía stream, lo que actualizará
   * activitiesLayer automáticamente en subscribeActivitiesStream().
   *
   * PARÁMETROS:
   * @param component - BoardComponent con las nuevas coordenadas x, y
   *
   * VALIDACIONES:
   * - category debe ser 'activity'
   * - activityId no puede ser null
   *
   * LOGS:
   * Imprime warning si el servicio no expone ningún método conocido.
   */
  private updateActivityPosition(component: BoardComponent): void {
    if (component.category !== 'activity' || component.activityId == null) return;

    const current = this.activitiesCache.find((a) => a.id === component.activityId) ?? null;
    const updated: Activity = {
      ...(current ?? {
        id: component.activityId,
        name: component.label ?? 'Activity',
        description: '',
      }),
      x: component.x,
      y: component.y,
      width: (current as any)?.width ?? 100,
      height: (current as any)?.height ?? 60,
      status: (current as any)?.status ?? 'active',
    };

    this.activityService.update(updated).subscribe({
      next: () => console.log('[Dashboard] Activity position updated'),
      error: (e) => console.error('[Dashboard] Error updating activity position:', e),
    });
  }

  /**
   * Recomputar boardComponents incluyendo gateways actuales
   *
   * PROPÓSITO:
   * Combinar las tres capas (gateways, activities, edges) en un solo array
   * para renderizar todos los elementos en el canvas.
   *
   * FLUJO:
   * 1. Filtrar gateways actuales de boardComponents
   * 2. Crear nuevo array: [...gateways, ...activitiesLayer, ...edgesLayer]
   * 3. Asignar a boardComponents
   * 4. Disparar detectChanges()
   *
   * ORDEN DE CAPAS:
   * 1. Gateways (primero, fondo)
   * 2. Activities (medio)
   * 3. Edges (último, líneas sobre elementos)
   *
   * PRESERVACIÓN DE GATEWAYS:
   * Los gateways se mantienen desde boardComponents actual porque
   * se actualizan vía subscribeGatewaysStream(), no desde una capa separada.
   *
   * LLAMADO DESDE:
   * - subscribeGatewaysStream(): después de actualizar gateways
   * - subscribeActivitiesStream(): después de actualizar activities
   * - subscribeEdgesStream(): después de actualizar edges
   * - recomputeBoardAfterLocalMove(): después de mover elemento
   *
   * DETECCIÓN DE CAMBIOS:
   * Se llama detectChanges() para forzar actualización inmediata del template.
   */
  private recomputeBoardIncludeCurrentGateways(): void {
    // Preservar gateways actuales de boardComponents (ya tienen posiciones actualizadas)
    const currentGateways = this.boardComponents.filter((c) => c.category === 'gateway');

    // Reconstruir con gateways preservados + capas actualizadas
    this.boardComponents = [
      ...currentGateways,
      ...this.activitiesLayer,
      ...this.edgesLayer
    ];

    this.cdr.detectChanges();
  }

  /**
   * Recomputar board después de mover elemento localmente
   *
   * PROPÓSITO:
   * Actualizar la capa correspondiente después de mover un elemento
   * en el canvas mediante drag & drop.
   *
   * FLUJO:
   * 1. Identificar la categoría del componente movido
   * 2. Actualizar x, y en la capa correspondiente (activitiesLayer o edgesLayer)
   * 3. Llamar recomputeBoardIncludeCurrentGateways() para reflejar cambios
   *
   * ACTUALIZACIÓN POR CATEGORÍA:
   * - activity: Actualiza x, y en activitiesLayer mediante map
   * - edge: Actualiza x, y en edgesLayer mediante map (aunque edges no usan posición)
   * - gateway: No se gestiona aquí, se actualiza directamente en boardComponents
   *
   * INMUTABILIDAD:
   * Usa map() con spread operator para crear nuevo array sin mutar el original.
   *
   * SINCRONIZACIÓN:
   * Después de actualizar la capa local, recomputeBoardIncludeCurrentGateways()
   * combina todas las capas en boardComponents.
   *
   * PARÁMETROS:
   * @param component - BoardComponent recién movido con nuevas coordenadas x, y
   *
   * LLAMADO DESDE:
   * onBoardDrop() después de actualizar las coordenadas del componente.
   *
   * NOTA:
   * Los gateways se gestionan directamente vía updateGatewayPosition()
   * y no necesitan actualizar una capa separada.
   */
  private recomputeBoardAfterLocalMove(component: BoardComponent): void {
    if (component.category === 'activity') {
      this.activitiesLayer = this.activitiesLayer.map((c) =>
        c.id === component.id ? { ...c, x: component.x, y: component.y } : c
      );
    } else if (component.category === 'edge') {
      this.edgesLayer = this.edgesLayer.map((c) =>
        c.id === component.id ? { ...c, x: component.x, y: component.y } : c
      );
    }
    this.recomputeBoardIncludeCurrentGateways();
  }

  /**
   * Utilidad: Generar hash único
   *
   * PROPÓSITO:
   * Crear identificadores únicos para elementos temporales que aún no tienen
   * ID del backend.
   *
   * ALGORITMO:
   * 1. Incrementar componentCounter en 1
   * 2. Aplicar módulo 1,000,000 para evitar desbordamiento
   * 3. Convertir a hexadecimal mediante toString(16)
   *
   * FORMATO:
   * Retorna string hexadecimal (ej: "1a2b", "3c4d", "ff00")
   *
   * USO:
   * Principalmente en subscribeEdgesStream() para crear IDs como:
   * "edge-local-{hash}"
   *
   * COLISIONES:
   * Con módulo 1,000,000, las colisiones son extremadamente raras en
   * una sesión de usuario normal.
   *
   * RETORNO:
   * String hexadecimal representando el contador actual.
   */
  private hash(): string {
    this.componentCounter = (this.componentCounter + 1) % 1_000_000;
    return this.componentCounter.toString(16);
  }
}
