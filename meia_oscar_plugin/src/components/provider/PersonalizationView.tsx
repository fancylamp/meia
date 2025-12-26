import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Item, ItemGroup, ItemContent, ItemTitle, ItemActions } from "@/components/ui/item"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Plus, Check, SpinnerGapIcon } from "@phosphor-icons/react"

type QuickAction = { text: string; enabled: boolean }

interface PersonalizationViewProps {
  loading: boolean
  quickActions: QuickAction[]
  encounterQuickActions: QuickAction[]
  customPrompt: string
  hasUnsavedPrompt: boolean
  setQuickActions: (actions: QuickAction[]) => void
  setEncounterQuickActions: (actions: QuickAction[]) => void
  setCustomPrompt: (prompt: string) => void
  savePersonalization: (actions: QuickAction[], encounterActions: QuickAction[], prompt: string) => void
}

export function PersonalizationView({
  loading, quickActions, encounterQuickActions, customPrompt, hasUnsavedPrompt,
  setQuickActions, setEncounterQuickActions, setCustomPrompt, savePersonalization
}: PersonalizationViewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState("")
  const [encounterEditingIndex, setEncounterEditingIndex] = useState<number | null>(null)
  const [encounterEditText, setEncounterEditText] = useState("")

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><SpinnerGapIcon size={24} className="animate-spin" /></div>
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto flex-1">
      <Card size="sm">
        <CardHeader><CardTitle className="font-semibold">Quick actions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">Provider view</p>
          <ItemGroup className="gap-0">
            {quickActions.map((action, i) => (
              <Item key={i} size="xs">
                <ItemContent><ItemTitle>{action.text}</ItemTitle></ItemContent>
                <ItemActions>
                  <Checkbox checked={action.enabled} onCheckedChange={() => {
                    const updated = quickActions.map((item, j) => j === i ? { ...item, enabled: !item.enabled } : item)
                    setQuickActions(updated)
                    savePersonalization(updated, encounterQuickActions, customPrompt)
                  }} />
                  <button onClick={() => {
                    const updated = quickActions.filter((_, j) => j !== i)
                    setQuickActions(updated)
                    savePersonalization(updated, encounterQuickActions, customPrompt)
                  }} className="hover:text-destructive"><X size={14} /></button>
                </ItemActions>
              </Item>
            ))}
            {editingIndex === -1 && (
              <Item size="xs">
                <ItemContent>
                  <input
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editText.trim()) {
                        const updated = [...quickActions, { text: editText.trim(), enabled: true }]
                        setQuickActions(updated)
                        savePersonalization(updated, encounterQuickActions, customPrompt)
                        setEditingIndex(null)
                        setEditText("")
                      } else if (e.key === "Escape") {
                        setEditingIndex(null)
                        setEditText("")
                      }
                    }}
                    className="flex-1 bg-transparent border-b border-input text-sm outline-none"
                    placeholder="Enter action text..."
                  />
                </ItemContent>
                <ItemActions>
                  <button onClick={() => {
                    if (editText.trim()) {
                      const updated = [...quickActions, { text: editText.trim(), enabled: true }]
                      setQuickActions(updated)
                      savePersonalization(updated, encounterQuickActions, customPrompt)
                    }
                    setEditingIndex(null)
                    setEditText("")
                  }} className="hover:text-green-500"><Check size={14} /></button>
                  <button onClick={() => { setEditingIndex(null); setEditText("") }} className="hover:text-destructive"><X size={14} /></button>
                </ItemActions>
              </Item>
            )}
          </ItemGroup>
          <Button size="sm" variant="outline" disabled={editingIndex !== null} onClick={() => setEditingIndex(-1)}><Plus size={14} className="mr-1" />Add</Button>
          
          <p className="text-xs text-muted-foreground mt-4">Encounter view</p>
          <ItemGroup className="gap-0">
            {encounterQuickActions.map((action, i) => (
              <Item key={i} size="xs">
                <ItemContent><ItemTitle>{action.text}</ItemTitle></ItemContent>
                <ItemActions>
                  <Checkbox checked={action.enabled} onCheckedChange={() => {
                    const updated = encounterQuickActions.map((item, j) => j === i ? { ...item, enabled: !item.enabled } : item)
                    setEncounterQuickActions(updated)
                    savePersonalization(quickActions, updated, customPrompt)
                  }} />
                  <button onClick={() => {
                    const updated = encounterQuickActions.filter((_, j) => j !== i)
                    setEncounterQuickActions(updated)
                    savePersonalization(quickActions, updated, customPrompt)
                  }} className="hover:text-destructive"><X size={14} /></button>
                </ItemActions>
              </Item>
            ))}
            {encounterEditingIndex === -1 && (
              <Item size="xs">
                <ItemContent>
                  <input
                    autoFocus
                    value={encounterEditText}
                    onChange={(e) => setEncounterEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && encounterEditText.trim()) {
                        const updated = [...encounterQuickActions, { text: encounterEditText.trim(), enabled: true }]
                        setEncounterQuickActions(updated)
                        savePersonalization(quickActions, updated, customPrompt)
                        setEncounterEditingIndex(null)
                        setEncounterEditText("")
                      } else if (e.key === "Escape") {
                        setEncounterEditingIndex(null)
                        setEncounterEditText("")
                      }
                    }}
                    className="flex-1 bg-transparent border-b border-input text-sm outline-none"
                    placeholder="Enter action text..."
                  />
                </ItemContent>
                <ItemActions>
                  <button onClick={() => {
                    if (encounterEditText.trim()) {
                      const updated = [...encounterQuickActions, { text: encounterEditText.trim(), enabled: true }]
                      setEncounterQuickActions(updated)
                      savePersonalization(quickActions, updated, customPrompt)
                    }
                    setEncounterEditingIndex(null)
                    setEncounterEditText("")
                  }} className="hover:text-green-500"><Check size={14} /></button>
                  <button onClick={() => { setEncounterEditingIndex(null); setEncounterEditText("") }} className="hover:text-destructive"><X size={14} /></button>
                </ItemActions>
              </Item>
            )}
          </ItemGroup>
          <Button size="sm" variant="outline" disabled={encounterEditingIndex !== null} onClick={() => setEncounterEditingIndex(-1)}><Plus size={14} className="mr-1" />Add</Button>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader><CardTitle className="font-semibold">Custom prompts</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Enter custom instructions..." className="min-h-[240px]" />
          <Button size="sm" disabled={!hasUnsavedPrompt} onClick={() => savePersonalization(quickActions, encounterQuickActions, customPrompt)}>Save</Button>
        </CardContent>
      </Card>
    </div>
  )
}
