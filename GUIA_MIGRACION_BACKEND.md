# 🔧 Guía de Migración: Frontend Mock → Backend Real

## 📌 Resumen
Actualmente los servicios funcionan con **datos mock in-memory** (BehaviorSubject). Para conectar con el backend Spring Boot, sigue estos pasos **SIN tocar los componentes** (ActivityPanel, GatewayPanel, EdgePanel, Dashboard).

---

## 🎯 Servicios a Migrar

1. **ActivityService** (`src/app/services/activity.service.ts`)
2. **GatewayService** (`src/app/services/gateway.service.ts`)
3. **EdgeService** (`src/app/services/edge.service.ts`)

---

## 📝 Pasos para CADA Servicio

### **Paso 1: Descomentar HttpClient**

```typescript
// ❌ ANTES (mock):
// constructor(private http: HttpClient) {}

// ✅ DESPUÉS (HTTP):
constructor(private http: HttpClient) {}
```

---

### **Paso 2: Descomentar URL del backend**

```typescript
// ❌ ANTES:
// private readonly httpBaseUrl = 'http://localhost:8080/api/activity';

// ✅ DESPUÉS (ajustar según tu backend):
private readonly httpBaseUrl = 'http://localhost:8080/api/activity';
```

**URLs esperadas:**
- ActivityService: `http://localhost:8080/api/activity`
- GatewayService: `http://localhost:8080/api/gateway`
- EdgeService: `http://localhost:8080/api/edge`

---

### **Paso 3: Reemplazar métodos mock por HTTP**

#### **ActivityService**

**3.1) Comentar el mock data inicial:**
```typescript
// ❌ COMENTAR ESTO:
/*
private readonly store = new BehaviorSubject<Activity[]>([
  { id: 1, name: 'Inicio', ... },
  { id: 2, name: 'Revisión', ... },
]);
*/

// ✅ REEMPLAZAR CON:
private readonly store = new BehaviorSubject<Activity[]>([]);
```

**3.2) Comentar métodos mock y descomentar métodos HTTP:**

```typescript
// ❌ COMENTAR ESTOS MÉTODOS MOCK:
/*
create(payload: Omit<Activity, 'id'>): Observable<Activity> {
  const current = this.store.value;
  const nextId = current.length ? Math.max(...current.map(a => a.id ?? 0)) + 1 : 1;
  const created: Activity = { id: nextId, ...payload };
  this.store.next([...current, created]);
  return of(created).pipe(delay(100));
}
*/

// ✅ DESCOMENTAR ESTOS MÉTODOS HTTP:
create(payload: Omit<Activity, 'id'>): Observable<Activity> {
  return this.http.post<Activity>(this.httpBaseUrl, payload).pipe(
    tap(created => {
      const current = this.store.value;
      this.store.next([...current, created]);
    })
  );
}

update(activity: Activity): Observable<Activity> {
  return this.http.put<Activity>(this.httpBaseUrl, activity).pipe(
    tap(updated => {
      const current = this.store.value;
      const index = current.findIndex(a => a.id === activity.id);
      if (index !== -1) {
        const newList = [...current];
        newList[index] = updated;
        this.store.next(newList);
      }
    })
  );
}

delete(id: number): Observable<void> {
  return this.http.delete<void>(`${this.httpBaseUrl}/${id}`).pipe(
    tap(() => {
      const current = this.store.value;
      this.store.next(current.filter(a => a.id !== id));
    })
  );
}
```

**3.3) Cargar datos iniciales al arrancar:**

Agregar en el constructor:
```typescript
constructor(private http: HttpClient) {
  // Cargar activities al iniciar la app
  this.http.get<Activity[]>(this.httpBaseUrl).pipe(
    tap(activities => this.store.next(activities))
  ).subscribe();
}
```

---

#### **GatewayService** (mismo patrón)

**3.1) Mock data inicial:**
```typescript
// ❌ COMENTAR:
/*
private readonly store = new BehaviorSubject<Gateway[]>([
  { id: 1, type: 'decision-gateway', ... },
]);
*/

// ✅ REEMPLAZAR:
private readonly store = new BehaviorSubject<Gateway[]>([]);
```

**3.2) Métodos HTTP:**
```typescript
constructor(private http: HttpClient) {
  this.http.get<Gateway[]>(this.httpBaseUrl).pipe(
    tap(gateways => this.store.next(gateways))
  ).subscribe();
}

create(payload: Omit<Gateway, 'id'>): Observable<Gateway> {
  return this.http.post<Gateway>(this.httpBaseUrl, payload).pipe(
    tap(created => {
      const current = this.store.value;
      this.store.next([...current, created]);
    })
  );
}

update(gateway: Gateway): Observable<Gateway> {
  return this.http.put<Gateway>(this.httpBaseUrl, gateway).pipe(
    tap(updated => {
      const current = this.store.value;
      const index = current.findIndex(g => g.id === gateway.id);
      if (index !== -1) {
        const newList = [...current];
        newList[index] = updated;
        this.store.next(newList);
      }
    })
  );
}

delete(id: number): Observable<void> {
  return this.http.delete<void>(`${this.httpBaseUrl}/${id}`).pipe(
    tap(() => {
      const current = this.store.value;
      this.store.next(current.filter(g => g.id !== id));
    })
  );
}
```

---

#### **EdgeService** (mismo patrón)

**3.1) Mock data inicial:**
```typescript
// ❌ COMENTAR:
/*
private readonly store = new BehaviorSubject<EdgeCompat[]>([
  { id: 1, fromType: 'activity', ... },
  { id: 2, fromType: 'gateway', ... },
  { id: 3, fromType: 'gateway', ... },
]);
*/

// ✅ REEMPLAZAR:
private readonly store = new BehaviorSubject<EdgeCompat[]>([]);
```

**3.2) Métodos HTTP:**
```typescript
constructor(private http: HttpClient) {
  this.http.get<EdgeCompat[]>(this.httpBaseUrl).pipe(
    tap(edges => this.store.next(edges))
  ).subscribe();
}

create(payload: Omit<EdgeCompat, 'id'>): Observable<EdgeCompat> {
  return this.http.post<EdgeCompat>(this.httpBaseUrl, payload).pipe(
    tap(created => {
      const current = this.store.value;
      this.store.next([...current, created]);
    })
  );
}

delete(id: number): Observable<void> {
  return this.http.delete<void>(`${this.httpBaseUrl}/${id}`).pipe(
    tap(() => {
      const current = this.store.value;
      this.store.next(current.filter(e => e.id !== id));
    })
  );
}
```

---

## 🔍 Verificar Endpoints del Backend

Asegúrate de que tu Spring Boot tenga estos endpoints:

### **ActivityController**
- `POST   /api/activity` → Crear (body: Activity sin id)
- `PUT    /api/activity` → Actualizar (body: Activity con id)
- `GET    /api/activity` → Listar todas
- `GET    /api/activity/{id}` → Obtener por id
- `DELETE /api/activity/{id}` → Eliminar

### **GatewayController**
- `POST   /api/gateway`
- `PUT    /api/gateway`
- `GET    /api/gateway`
- `GET    /api/gateway/{id}`
- `DELETE /api/gateway/{id}`

### **EdgeController**
- `POST   /api/edge`
- `GET    /api/edge`
- `DELETE /api/edge/{id}`

---

## 🛡️ CORS Configuration (Backend)

Agregar en tu Spring Boot:

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:4200")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
```

---

## 📦 Modelos Backend (JSON esperado)

### **Activity (Java → JSON)**
```json
{
  "id": 1,
  "name": "Inicio",
  "description": "Primera actividad",
  "x": 200,
  "y": 180,
  "width": 100,
  "height": 60,
  "status": "active",
  "processId": 10,
  "roleId": 5
}
```

### **Gateway (Java → JSON)**
```json
{
  "id": 1,
  "type": "decision-gateway",
  "x": 300,
  "y": 250,
  "status": "active",
  "processId": 10
}
```

### **Edge (Java → JSON)**
```json
{
  "id": 1,
  "fromType": "activity",
  "fromId": 1,
  "toType": "gateway",
  "toId": 2,
  "label": "Condición A",
  "processId": 10
}
```

---

## ✅ Testing

1. **Arrancar backend Spring Boot:**
   ```bash
   mvn spring-boot:run
   ```

2. **Arrancar frontend Angular:**
   ```bash
   npm start
   ```

3. **Verificar en Browser:**
   - Abrir DevTools → Network
   - Crear una Activity → Debe aparecer `POST http://localhost:8080/api/activity`
   - Crear un Gateway → Debe aparecer `POST http://localhost:8080/api/gateway`
   - Crear un Edge → Debe aparecer `POST http://localhost:8080/api/edge`

---

## 🎯 Ventajas de este Patrón

✅ **CERO cambios en componentes** (ActivityPanel, GatewayPanel, EdgePanel, Dashboard)  
✅ **BehaviorSubject mantiene cache local** → UI reactiva instantánea  
✅ **HTTP sincroniza con backend** → Persistencia en base de datos  
✅ **Fácil rollback** → Si falla backend, volver a comentar HTTP y descomentar mock  

---

## 🚨 Troubleshooting

### **Error: CORS blocked**
→ Verificar `CorsConfig` en Spring Boot

### **Error: 404 Not Found**
→ Verificar que las URLs coincidan (`http://localhost:8080/api/...`)

### **Error: Network timeout**
→ Verificar que Spring Boot esté corriendo

### **No se ven datos al cargar**
→ Verificar que el constructor llame `this.http.get<>()` al iniciar

---

## 📁 Archivos a Modificar

- ✏️ `src/app/services/activity.service.ts`
- ✏️ `src/app/services/gateway.service.ts`
- ✏️ `src/app/services/edge.service.ts`

**NO tocar:**
- ✅ `src/app/pages/dashboard/activity/activity-panel.ts`
- ✅ `src/app/pages/dashboard/gateway/gateway-panel.ts`
- ✅ `src/app/pages/dashboard/edge/edge-panel.ts`
- ✅ `src/app/pages/dashboard/dashboard.ts`

---

## 🎉 Resultado Final

Después de estos cambios:
- Los componentes siguen funcionando igual
- Los datos vienen del backend Spring Boot
- Se persisten en la base de datos
- La UI se actualiza reactivamente con el cache local

**¡Listo para producción!** 🚀
