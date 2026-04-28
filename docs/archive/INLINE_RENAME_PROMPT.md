# Inline rename prompt (archived)

> **Historical (superseded).** Worksheet and group rename uses `InlineRenameInput`
> (`src/ui/components/InlineRenameInput/`) from `SheetRow` and `GroupCard`. The modal
> `TextPromptDialog` / `useTextPromptState` flow described below no longer exists. Kept for
> design history only.

## Prompt: Implementar Inline Rename para Worksheets y Groups

## Contexto del Proyecto

Plugin de Excel "Sheet Navigator" – un navegador de hojas de cálculo con arquitectura React clean. El proyecto usa:

- TypeScript
- CSS con tokens themáticos (`--excel-body-fg`, `--excel-control-bg`, etc.)
- Office.js para integración con Excel
- patrón container-presentational

## Situación Actual

Cuando el usuario hace click en "Rename" en el context menu de una hoja o grupo, se abre un dialog modal (`TextPromptDialog`) que interrumpe el flujo del usuario. Este dialog está implementado en:

- `src/ui/components/TextPromptDialog/index.tsx` (componente)
- `src/ui/components/TextPromptDialog/TextPromptDialog.css` (estilos)
- `src/ui/taskpane/hooks/useTextPromptState.ts` (estado y lógica)
- `src/ui/taskpane/TaskpaneAppContainer.tsx` (integración)

El objetivo es reemplazar este dialog por un input inline de rename, similar a cómo ya funciona `InlineGroupCreator` (`src/ui/components/InlineGroupCreator/`).

## Investigación Realizada

### Archivos Relevantes y su Rol

| Archivo                                                 | Propósito                                                                                                        |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/ui/components/SheetRow/index.tsx`                  | Renderiza cada fila de worksheet. Contiene el título en `<span className="sheet-title">` línea 139               |
| `src/ui/components/GroupCard/index.tsx`                 | Renderiza el header del grupo con `<span className="group-title">` línea 91                                      |
| `src/ui/taskpane/TaskpaneAppContainer.tsx`              | Recibe `controller.renameWorksheet` (línea 41) y `controller.renameGroup` (línea 40), los pasa a través de props |
| `src/ui/taskpane/hooks/useTextPromptState.ts`           | Maneja estado de rename (`textPrompt`) con tipos `rename-sheet` y `rename-group`                                 |
| `src/application/navigation/useNavigationController.ts` | Expone métodos `renameWorksheet(worksheetId, name)` y `renameGroup(groupId, name)`                               |

### Flujo Actual del Rename

1. Context menu → click "Rename"
2. `openRenameWorksheetPrompt(worksheetId, name)` → cierra menus → setea `textPrompt`
3. `TextPromptDialog` se renderiza condicionalmente
4. Usuario completa y submit → `submitTextPrompt(trimmedValue)` → llama al controller

### Componente de Referencia (InlineGroupCreator)

El componente `InlineGroupCreator` ya implementa el patrón inline que necesitamos:

- Ubicación: `src/ui/components/InlineGroupCreator/`
- Usa `useRef` para el input y focus management
- Maneja `Enter` para submit, `Escape` para cancelar
- Estados: `name` (string), `hasContent` (boolean)
- Usa `window.requestAnimationFrame` para auto-focus

## Plan de Implementación

### 1. Crear componente reutilizable: `InlineRenameInput`

**Ubicación sugerida:** `src/ui/components/InlineRenameInput/index.tsx`

Props:

```typescript
interface InlineRenameInputProps {
  value: string;
  onSubmit: (newValue: string) => void | Promise<void>;
  onCancel: () => void;
  autoFocus?: boolean;
}
```

Comportamiento:

- Input inline con el texto actual seleccionado
- `Enter` → submit si no está vacío
- `Escape` → cancelar
- Click fuera → cancelar
- Foco automático al montar
- Soporte para async submit (para renombrar en Excel)

### 2. Modificar `SheetRow`

- Agregar prop opcional: `isRenaming?: boolean`
- Agregar prop opcional: `onStartRename?: () => void`
- Cuando `isRenaming={true}`, renderizar `InlineRenameInput` en vez del `<span className="sheet-title">`
- El título de la hoja viene de `worksheet.name`

### 3. Modificar `GroupCard`

- Mismo patrón que SheetRow para el header del grupo
- Cuando renombrando, mostrar input en vez de `<span className="group-title">`

### 4. Modificar `TaskpaneAppContainer`

- Agregar estado local para tracking rename activo:
  ```typescript
  const [renamingWorksheetId, setRenamingWorksheetId] = useState<string | null>(null);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  ```
- Modificar los handlers de rename:
  - En vez de abrir dialog, setear el estado de renaming
  - El submit del inline input llama al controller y limpia el estado
- Eliminar el render de `TextPromptDialog` para rename (mantener para otros uses si aplica)
- Pasar props a `SheetList` y `GroupCard`

### 5. Actualizar estilos

- Agregar CSS para el input inline de rename
- Debe seguir los mismos tokens que `InlineGroupCreator`:
  - Background: theme-aware (blanco/negro según modo)
  - Border: `var(--excel-border)`
  - Focus: sin box-shadow excesivo
- Ubicación: crear `InlineRenameInput.css` o agregar a existente

## Edge Cases a Considerar

1. **Nombre idéntico al actual:** Verificar `newValue !== initialValue` antes de hacer submit
2. **Excel rename falla:** El controller ya maneja errores, mantener estado de renaming para reintento
3. **Worksheet se activa mientras renombra:** Permitir que el estado se limpie ( UX aceptable)
4. **Nombre vacío:** Prevenir submit si `trimmedValue` está vacío
5. **Usuario navega a otra sheet mientras renombra:** Cerrar modo rename automáticamente
6. **Drag mientras renombra:** El drag debería estar deshabilitado mientras en modo rename
7. **Context menu abierto:** No permitir rename si hay otro menu abierto
8. **Tema oscuro/claro:** El input debe responder a los temas como el resto de componentes

## Tokens CSS a Utilizar (referencia)

```css
--excel-body-bg: #f3f2f1 (light) / [dynamic en dark] --excel-body-fg: #201f1e (light) / white (dark)
  --excel-control-bg: #ffffff (light) / [dynamic en dark] --excel-border: #e1dfdd (light) /
  rgba(255, 255, 255, 0.12) (dark) --excel-muted: #605e5c (light) / rgba(255, 255, 255, 0.7) (dark);
```

## Notas de Arquitectura

- El rename de worksheet llama a `Excel.Worksheet.name` (async) – debe esperar el resultado
- El rename de grupo es local (no toca Excel) – synchronous
- El estado de renaming debe estar en el componente contenedor (`TaskpaneAppContainer`) para mantener consistencia con el resto de la UI
- Considerar usar el hook `useTextPromptState` como referencia pero simplificarlo para el caso inline

## Criterios de Éxito

- El usuario puede renombrar sin perder foco del context menu
- El input se comporta consistentemente en light/dark mode
- El rename de hoja actualiza el nombre real en Excel
- El flow es fluido y no interrumpe la navegación
- Tests unitarios pasan para SheetRow y GroupCard
