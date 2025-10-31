# 🔌 GUÍA DE MIGRACIÓN AL BACKEND - Proyecto BPMN Frontend

## 📊 ESTADO ACTUAL (31 Oct 2025)

### ✅ **Completado:**

#### **1. Modelos actualizados** (compatibles con backend Spring Boot)
- ✅ `Activity.ts` - Con campos obligatorios (name, description, x, y, width, height, status)
- ✅ `Edge.ts` - Con extremos tipados (fromType/fromId, toType/toId) + legacy (activitySourceId/activityDestinyId)
- ✅ `Gateway.ts` - Con posición (x, y) y tipo

#### **2. GatewayService - PATRÓN HÍBRIDO ACTIVO** 🟢
```typescript
✅ BehaviorSubject interno (store reactivo)
✅ Stream público (list$, items$)
✅ Métodos HTTP conectados al backend
✅ Cache local que se actualiza tras operaciones
```

**Funcionalidad:**
- Dashboard y EdgePanel comparten el MISMO estado
- Gateways persisten en backend real (`http://localhost:8080/api/gateway`)
- Cambios se propagan automáticamente

#### **3. ActivityService - PATRÓN HÍBRIDO IN-MEMORY** 🟡
```typescript
✅ BehaviorSubject interno (store reactivo)
✅ Stream público (list$, items$)
⚠️ Métodos HTTP preparados (comentados)
⚠️ Actualmente in-memory (mock)
```

**Funcionalidad:**
- Funciona 100% con mock local
- Listo para activar backend con cambio mínimo
- **Activities se pierden al refrescar** (temporal)

#### **4. EdgeService - PATRÓN HÍBRIDO IN-MEMORY** 🟡
```typescript
✅ BehaviorSubject interno (store reactivo)
✅ Stream público (list$, items$)
✅ Compatibilidad legacy + tipado
⚠️ Métodos HTTP preparados (comentados)
⚠️ Actualmente in-memory (mock)
```

**Funcionalidad:**
- Soporta conexiones A↔A, A↔G, G↔A, G↔G
- Normalización automática de extremos
- Listo para activar backend con cambio mínimo
- **Edges se pierden al refrescar** (temporal)

#### **5. Dashboard actualizado** 🟢
```typescript
✅ Suscripción a gatewayService.list$ (stream reactivo)
✅ Suscripción a activityService.list$
✅ Suscripción a edgeService.list$
✅ EdgePanel ve los mismos gateways que el Dashboard
```

---

## 🎯 SIGUIENTE PASO: CONECTAR ACTIVITY Y EDGE AL BACKEND

### **PREREQUISITO: Backend debe implementar endpoints**

#### **A. Endpoints de Activity**
```
POST   /api/activity          → Crear (body: Activity sin id)
PUT    /api/activity          → Actualizar (body: Activity con id)
GET    /api/activity          → Listar todas
GET    /api/activity/{id}     → Obtener por id
DELETE /api/activity/{id}     → Eliminar
```

**Modelo backend debe aceptar:**
```json
{
  "name": "string",
  "description": "string",
  "x": 200,
  "y": 150,
  "width": 100,
  "height": 60,
  "status": "active",
  "processId": 1,
  "roleId": 2
}
```

#### **B. Endpoints de Edge**
```
POST   /api/edge              → Crear (body: Edge sin id)
PUT    /api/edge              → Actualizar (body: Edge con id)
GET    /api/edge              → Listar todos
GET    /api/edge/{id}         → Obtener por id
DELETE /api/edge/{id}         → Eliminar
```

**Modelo backend DEBE aceptar extremos tipados:**
```json
{
  "label": "Flujo aprobado",
  "description": "",
  "fromType": "activity",
  "fromId": 5,
  "toType": "gateway",
  "toId": 2,
  "processId": 1,
  "status": "active",
  
  // OPCIONAL: legacy (solo si backend viejo requiere A→A)
  "activitySourceId": null,
  "activityDestinyId": null
}
```

**⚠️ Backend DEBE validar:**
- No permitir `fromType === toType && fromId === toId` (un nodo no puede conectarse consigo mismo)
- Verificar que los IDs referenciados existen (foreign keys)

---

## 🚀 ACTIVAR BACKEND EN 3 PASOS

### **PASO 1: ActivityService → HTTP**

En `src/app/services/activity.service.ts`:

1. **Descomentar:**
```typescript
// ✅ ACTIVAR ESTAS LÍNEAS:
private readonly httpBaseUrl = 'http://localhost:8080/api/activity';
constructor(private http: HttpClient) {}
```

2. **Reemplazar métodos mock:**
```typescript
// ❌ ELIMINAR métodos create(), update(), delete() actuales

// ✅ RENOMBRAR métodos HTTP:
createActivityHTTP() → create()
updateActivityHTTP() → update()
deleteActivityHTTP() → delete()
getAllActivitiesHTTP() → getAll() // Llamar en ngOnInit del Dashboard
```

3. **Actualizar Dashboard:**
```typescript
// En ngOnInit, cargar activities iniciales:
this.activityService.getAll().subscribe();
```

### **PASO 2: EdgeService → HTTP**

En `src/app/services/edge.service.ts`:

1. **Descomentar:**
```typescript
private readonly httpBaseUrl = 'http://localhost:8080/api/edge';
constructor(private http: HttpClient) {}
```

2. **Reemplazar métodos mock:**
```typescript
// ❌ ELIMINAR métodos create(), update(), delete() actuales

// ✅ RENOMBRAR métodos HTTP:
createEdgeHTTP() → create()
updateEdgeHTTP() → update()
deleteEdgeHTTP() → delete()
getAllEdgesHTTP() → getAll() // Llamar en ngOnInit del Dashboard
```

3. **Actualizar Dashboard:**
```typescript
// En ngOnInit, cargar edges iniciales:
this.edgeService.getAll().subscribe();
```

### **PASO 3: Probar conectividad**

```bash
# 1. Verificar que el backend esté corriendo
curl http://localhost:8080/api/activity
curl http://localhost:8080/api/edge
curl http://localhost:8080/api/gateway

# 2. Iniciar frontend
cd front
npm start

# 3. Probar en navegador (http://localhost:4200)
# - Crear Activity → debe persistir en backend
# - Mover Activity → debe actualizar coords en backend
# - Crear Edge A→A → debe persistir
# - Crear Edge A→G → debe persistir con tipos
# - Refrescar página → todo debe cargar desde backend
```

---

## 📋 CHECKLIST DE VALIDACIÓN

### **Funcionalidad completa:**
- [ ] Gateways cargan desde backend ✅ (ya funciona)
- [ ] Activities cargan desde backend
- [ ] Edges cargan desde backend
- [ ] Crear Activity → persiste en backend
- [ ] Mover Activity → actualiza coords en backend
- [ ] Crear Gateway → persiste en backend (ya funciona)
- [ ] Mover Gateway → actualiza coords en backend (ya funciona)
- [ ] Crear Edge A→A → persiste
- [ ] Crear Edge A→G → persiste con fromType/toType
- [ ] Crear Edge G→A → persiste
- [ ] Crear Edge G→G → persiste
- [ ] Eliminar Activity → elimina del backend
- [ ] Eliminar Gateway → elimina del backend (ya funciona)
- [ ] Eliminar Edge → elimina del backend
- [ ] Refrescar página → todo se recarga desde backend
- [ ] EdgePanel ve gateways del dashboard ✅ (ya funciona)
- [ ] Pan del canvas funciona ✅ (ya funciona)
- [ ] Líneas SVG se dibujan correctamente ✅ (ya funciona)

---

## 🔧 CONFIGURACIÓN DEL BACKEND (para tu equipo Java)

### **Activity Controller**
```java
@RestController
@RequestMapping("/api/activity")
@CrossOrigin(origins = "*")
public class ActivityController {
    
    @PostMapping
    public ResponseEntity<ActivityDTO> create(@RequestBody ActivityDTO activity) {
        // Validar: name, description, x, y, width, height requeridos
        // Guardar en BD
        // Retornar con id generado
    }
    
    @PutMapping
    public ResponseEntity<ActivityDTO> update(@RequestBody ActivityDTO activity) {
        // Validar: id requerido
        // Actualizar en BD (incluye x, y si se movió en canvas)
        // Retornar actualizado
    }
    
    @GetMapping
    public ResponseEntity<List<ActivityDTO>> getAll() {
        // Retornar todas las activities
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<ActivityDTO> getById(@PathVariable Long id) {
        // Retornar activity por id
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        // Eliminar de BD
        // Retornar 204 No Content
    }
}
```

### **Edge Controller**
```java
@RestController
@RequestMapping("/api/edge")
@CrossOrigin(origins = "*")
public class EdgeController {
    
    @PostMapping
    public ResponseEntity<EdgeDTO> create(@RequestBody EdgeDTO edge) {
        // Validar: fromType, fromId, toType, toId requeridos
        // Validar: NO permitir (fromType==toType && fromId==toId)
        // Verificar foreign keys (activity/gateway existen)
        // Guardar en BD
        // Retornar con id generado
    }
    
    @PutMapping
    public ResponseEntity<EdgeDTO> update(@RequestBody EdgeDTO edge) {
        // Validar: id requerido
        // Aplicar mismas validaciones que create
        // Actualizar en BD
        // Retornar actualizado
    }
    
    @GetMapping
    public ResponseEntity<List<EdgeDTO>> getAll() {
        // Retornar todos los edges
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<EdgeDTO> getById(@PathVariable Long id) {
        // Retornar edge por id
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        // Eliminar de BD
        // Retornar 204 No Content
    }
}
```

### **Modelos JPA**

```java
@Entity
public class Activity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column
    private String description;
    
    @Column(nullable = false)
    private Integer x;
    
    @Column(nullable = false)
    private Integer y;
    
    @Column(nullable = false)
    private Integer width;
    
    @Column(nullable = false)
    private Integer height;
    
    @Column(nullable = false)
    private String status; // "active" | "inactive"
    
    @ManyToOne
    @JoinColumn(name = "process_id")
    private Process process;
    
    @ManyToOne
    @JoinColumn(name = "role_id")
    private Role role;
    
    // Getters/Setters
}
```

```java
@Entity
public class Edge {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column
    private String label;
    
    @Column
    private String description;
    
    // NUEVO: extremos tipados
    @Column(nullable = false)
    private String fromType; // "activity" | "gateway"
    
    @Column(nullable = false)
    private Long fromId;
    
    @Column(nullable = false)
    private String toType; // "activity" | "gateway"
    
    @Column(nullable = false)
    private Long toId;
    
    @Column(nullable = false)
    private String status; // "active" | "inactive"
    
    @ManyToOne
    @JoinColumn(name = "process_id")
    private Process process;
    
    // OPCIONAL: legacy (solo si necesitas compatibilidad)
    @Column
    private Long activitySourceId;
    
    @Column
    private Long activityDestinyId;
    
    // Validación custom
    @PrePersist
    @PreUpdate
    private void validate() {
        if (fromType.equals(toType) && fromId.equals(toId)) {
            throw new IllegalArgumentException("Edge cannot connect a node to itself");
        }
    }
    
    // Getters/Setters
}
```

---

## 🎓 EXPLICACIÓN PARA EL PROFESOR

> "Hemos implementado un **patrón híbrido de servicios** que permite:
>
> 1. **Gateways** ya están **completamente conectados al backend** (HTTP + store reactivo)
> 2. **Activities y Edges** usan **stores reactivos in-memory** por ahora, pero tienen los **métodos HTTP preparados** (comentados)
> 3. Cuando el backend implemente los endpoints de Activity y Edge, solo debemos:
>    - Descomentar 2 líneas por servicio
>    - Renombrar métodos HTTP
>    - Llamar `getAll()` en `ngOnInit`
> 4. **Cero cambios** en componentes (Dashboard, EdgePanel, ActivityPanel)
> 5. La arquitectura ya está lista para **persistencia completa**
>
> **Ventajas de este enfoque:**
> - Frontend funciona 100% ahora (sin esperar backend)
> - Gateways ya persisten en backend real
> - EdgePanel ya ve los gateways compartidos (problema resuelto)
> - Migración incremental sin romper nada
> - Patrón escalable para futuras entidades"

---

## 📞 CONTACTO CON BACKEND

**Necesitamos que el equipo de backend implemente:**

1. **Activity endpoints** (POST, PUT, GET, DELETE)
2. **Edge endpoints** (POST, PUT, GET, DELETE)
3. **Validación de extremos tipados** en Edge (fromType/fromId, toType/toId)

**Tiempo estimado:** 2-3 días de desarrollo backend

**Mientras tanto:** El frontend sigue avanzando con mock

---

## 🎉 RESULTADO FINAL

Una vez completada la migración:

- ✅ Gateways → Backend HTTP ✅ **YA FUNCIONA**
- ✅ Activities → Backend HTTP
- ✅ Edges → Backend HTTP
- ✅ Persistencia completa (refrescar página no pierde datos)
- ✅ Conexiones tipadas A↔G funcionando
- ✅ EdgePanel con gateways reactivos ✅ **YA FUNCIONA**
- ✅ Dashboard con pan y SVG ✅ **YA FUNCIONA**

---

**Fecha:** 31 de octubre de 2025  
**Estado:** Fase 1 completada (GatewayService reactivo + modelos preparados)  
**Siguiente:** Esperar endpoints de backend para Activity y Edge
