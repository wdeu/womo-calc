import { useEffect, useState } from "react";
import {
  ActionPanel,
  Action,
  List,
  Form,
  showToast,
  Toast,
  Icon,
  Color,
  LocalStorage,
  Clipboard,
  confirmAlert,
  Alert,
} from "@raycast/api";

interface Expense {
  id: string;
  year: number;
  category: string;
  description: string;
  amount: number;
}

interface UsageDays {
  year: number;
  days: number;
}

interface StorageData {
  version: number;
  expenses: Expense[];
  usageDays: UsageDays[];
}

const DATA_VERSION = 1;
const STORAGE_KEY = "womo-calc-data";

// 🔧 KATEGORIEN - Hier kannst du Kategorien ändern/ergänzen
const CATEGORIES = [
  "Anschaffung",
  "Zusatzausstattung",
  "Wartung",
  "TÜV",
  "Reparatur",
  "Reifen",
  "Stellplatz",
  "Sprit",
  "Garage",
  "Versicherung",
  "Restwert",
  "Sonstiges",
];

// 📝 KATEGORIE-MIGRATION - Definiere hier Umbenennungen
const CATEGORY_MIGRATIONS: { [oldName: string]: string } = {
  "Restwert (negativ)": "Restwert",
};

export default function Command() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [usageDays, setUsageDays] = useState<UsageDays[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (data) {
        const parsed: StorageData = JSON.parse(data);
        
        const migratedExpenses = migrateExpenses(parsed.expenses || []);
        
        setExpenses(migratedExpenses);
        setUsageDays(parsed.usageDays || []);
        
        if (parsed.version !== DATA_VERSION) {
          await saveData(migratedExpenses, parsed.usageDays || []);
          showToast(Toast.Style.Success, "Daten aktualisiert", "Migration erfolgreich");
        }
      }
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      showToast(Toast.Style.Failure, "Fehler beim Laden der Daten");
    } finally {
      setIsLoading(false);
    }
  }

  function migrateExpenses(expenses: Expense[]): Expense[] {
    return expenses.map(expense => {
      const migratedCategory = CATEGORY_MIGRATIONS[expense.category] || expense.category;
      
      if (!CATEGORIES.includes(migratedCategory)) {
        console.warn(`Kategorie "${migratedCategory}" existiert nicht mehr. Setze auf "Sonstiges".`);
        return { ...expense, category: "Sonstiges" };
      }
      
      return { ...expense, category: migratedCategory };
    });
  }

  async function saveData(newExpenses: Expense[], newUsageDays: UsageDays[]) {
    const data: StorageData = {
      version: DATA_VERSION,
      expenses: newExpenses,
      usageDays: newUsageDays,
    };
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  async function exportCSV() {
    try {
      // CSV Header mit deutschen Trennzeichen
      let csv = "Jahr;Kategorie;Bezeichnung;Betrag\n";
      
      // Ausgaben sortiert nach Jahr
      expenses
        .sort((a, b) => a.year - b.year)
        .forEach((e) => {
          // Verwende Komma als Dezimaltrenner für deutsche Lokalisierung
          const betrag = e.amount.toFixed(2).replace('.', ',');
          csv += `${e.year};${e.category};${e.description};${betrag}\n`;
        });
      
      // Trennzeile
      csv += "\n";
      
      // Nutzungstage
      csv += "Jahr;Nutzungstage\n";
      usageDays
        .sort((a, b) => a.year - b.year)
        .forEach((u) => {
          csv += `${u.year};${u.days}\n`;
        });
      
      await Clipboard.copy(csv);
      showToast(Toast.Style.Success, "CSV exportiert", "In Zwischenablage kopiert");
    } catch (error) {
      showToast(Toast.Style.Failure, "CSV-Export fehlgeschlagen");
    }
  }

  async function exportData() {
    try {
      const data: StorageData = {
        version: DATA_VERSION,
        expenses,
        usageDays,
      };
      const jsonString = JSON.stringify(data, null, 2);
      await Clipboard.copy(jsonString);
      showToast(Toast.Style.Success, "Daten exportiert", "JSON in Zwischenablage kopiert");
    } catch (error) {
      showToast(Toast.Style.Failure, "Export fehlgeschlagen");
    }
  }

  async function importData() {
    try {
      const clipboardText = await Clipboard.readText();
      if (!clipboardText) {
        showToast(Toast.Style.Failure, "Zwischenablage leer");
        return;
      }

      const parsed: StorageData = JSON.parse(clipboardText);
      
      if (!parsed.expenses || !Array.isArray(parsed.expenses)) {
        showToast(Toast.Style.Failure, "Ungültiges Datenformat");
        return;
      }

      const migratedExpenses = migrateExpenses(parsed.expenses);
      setExpenses(migratedExpenses);
      setUsageDays(parsed.usageDays || []);
      await saveData(migratedExpenses, parsed.usageDays || []);
      
      showToast(Toast.Style.Success, "Daten importiert", `${migratedExpenses.length} Ausgaben geladen`);
    } catch (error) {
      showToast(Toast.Style.Failure, "Import fehlgeschlagen", "Ungültige JSON-Daten");
    }
  }

  async function resetAllData() {
    const confirmed = await confirmAlert({
      title: "Alle Daten löschen?",
      message: "Diese Aktion kann nicht rückgängig gemacht werden. Exportiere deine Daten vorher!",
      primaryAction: {
        title: "Alles löschen",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await LocalStorage.removeItem(STORAGE_KEY);
      setExpenses([]);
      setUsageDays([]);
      showToast(Toast.Style.Success, "Alle Daten gelöscht");
    }
  }

  async function deleteExpense(id: string) {
    const newExpenses = expenses.filter((e) => e.id !== id);
    setExpenses(newExpenses);
    await saveData(newExpenses, usageDays);
    showToast(Toast.Style.Success, "Ausgabe gelöscht");
  }

  async function deleteUsageDays(year: number) {
    const newUsageDays = usageDays.filter((u) => u.year !== year);
    setUsageDays(newUsageDays);
    await saveData(expenses, newUsageDays);
    showToast(Toast.Style.Success, "Nutzungstage gelöscht");
  }

  function calculateStats() {
    let grossExpenses = 0;
    let restwert = 0;
    
    expenses.forEach((e) => {
      if (e.category === "Restwert") {
        restwert += e.amount;
      } else {
        grossExpenses += e.amount;
      }
    });
    
    const netExpenses = grossExpenses - restwert;
    
    const totalDays = usageDays.reduce((sum, u) => sum + u.days, 0);
    const costPerDay = totalDays > 0 ? netExpenses / totalDays : 0;

    const byYear: { [year: number]: { expenses: number; days: number } } = {};
    
    expenses.forEach((e) => {
      if (!byYear[e.year]) byYear[e.year] = { expenses: 0, days: 0 };
      if (e.category === "Restwert") {
        byYear[e.year].expenses -= e.amount;
      } else {
        byYear[e.year].expenses += e.amount;
      }
    });

    usageDays.forEach((u) => {
      if (!byYear[u.year]) byYear[u.year] = { expenses: 0, days: 0 };
      byYear[u.year].days += u.days;
    });

    const byCategory: { [category: string]: number } = {};
    expenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });

    return { 
      netExpenses,
      grossExpenses,
      restwert,
      totalDays, 
      costPerDay, 
      byYear, 
      byCategory 
    };
  }

  const stats = calculateStats();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Suche in Ausgaben...">
      <List.Section title="➕ Dateneingabe">
        <List.Item
          title="Neue Ausgabe hinzufügen"
          icon={{ source: Icon.Plus, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action.Push
                title="Ausgabe hinzufügen"
                icon={Icon.Plus}
                target={
                  <AddExpenseForm
                    onAdd={async (expense) => {
                      const newExpenses = [...expenses, expense];
                      setExpenses(newExpenses);
                      await saveData(newExpenses, usageDays);
                      showToast(Toast.Style.Success, "Ausgabe hinzugefügt");
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Nutzungstage hinzufügen"
          icon={{ source: Icon.Plus, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action.Push
                title="Nutzungstage hinzufügen"
                icon={Icon.Plus}
                target={
                  <AddUsageDaysForm
                    onAdd={async (usage) => {
                      const existing = usageDays.find((u) => u.year === usage.year);
                      let newUsageDays: UsageDays[];
                      if (existing) {
                        newUsageDays = usageDays.map((u) =>
                          u.year === usage.year ? usage : u
                        );
                      } else {
                        newUsageDays = [...usageDays, usage];
                      }
                      setUsageDays(newUsageDays);
                      await saveData(expenses, newUsageDays);
                      showToast(Toast.Style.Success, "Nutzungstage gespeichert");
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="📊 Rentabilitätsrechnung">
        <List.Item
          title="Brutto-Ausgaben"
          subtitle="Alle Ausgaben ohne Restwert"
          accessories={[
            {
              text: `${stats.grossExpenses.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
              icon: { source: Icon.BankNote, tintColor: Color.Orange },
            },
          ]}
        />
        <List.Item
          title="Restwert"
          subtitle="Aktueller/erwarteter Wiederverkaufswert"
          accessories={[
            {
              text: `− ${stats.restwert.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
              icon: { source: Icon.Minus, tintColor: Color.Green },
            },
          ]}
        />
        <List.Item
          title="Netto-Wertverlust"
          subtitle="Tatsächliche Kosten (Brutto − Restwert)"
          accessories={[
            {
              text: `${stats.netExpenses.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
              icon: { source: Icon.Euro, tintColor: Color.Red },
            },
          ]}
        />
        <List.Item
          title="Nutzungstage gesamt"
          accessories={[
            {
              text: `${stats.totalDays} Tage`,
              icon: { source: Icon.Calendar, tintColor: Color.Blue },
            },
          ]}
        />
        <List.Item
          title="Kosten pro Nutzungstag"
          accessories={[
            {
              text: stats.totalDays > 0 
                ? `${stats.costPerDay.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` 
                : "—",
              icon: { source: Icon.Calculator, tintColor: Color.Green },
            },
          ]}
        />
      </List.Section>

      <List.Section title="📂 Nach Kategorie">
        {Object.entries(stats.byCategory)
          .sort((a, b) => b[1] - a[1])
          .map(([category, amount]) => {
            const isRestwert = category === "Restwert";
            const percentage = isRestwert 
              ? ((amount / stats.grossExpenses) * 100)
              : ((amount / stats.netExpenses) * 100);
            
            return (
              <List.Item
                key={category}
                title={category}
                accessories={[
                  {
                    text: `${amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`,
                    tooltip: `${percentage.toFixed(1)}% ${isRestwert ? 'der Brutto-Ausgaben' : 'der Netto-Kosten'}`,
                  },
                ]}
              />
            );
          })}
      </List.Section>

      <List.Section title="📅 Jahresübersicht">
        {Object.keys(stats.byYear)
          .sort((a, b) => Number(b) - Number(a))
          .map((year) => {
            const yearData = stats.byYear[Number(year)];
            const yearCostPerDay = yearData.days > 0 ? yearData.expenses / yearData.days : 0;
            return (
              <List.Item
                key={year}
                title={`Jahr ${year}`}
                subtitle={`${yearData.expenses.toLocaleString('de-DE', { minimumFractionDigits: 2 })} € • ${yearData.days} Tage`}
                accessories={[
                  {
                    text: yearData.days > 0 
                      ? `${yearCostPerDay.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €/Tag` 
                      : "Keine Nutzung",
                  },
                ]}
              />
            );
          })}
        {Object.keys(stats.byYear).length === 0 && (
          <List.Item
            title="Noch keine Daten"
            subtitle="Füge Ausgaben und Nutzungstage hinzu"
            icon={Icon.Info}
          />
        )}
      </List.Section>

      <List.Section title="💰 Ausgaben">
        {expenses
          .sort((a, b) => b.year - a.year || a.category.localeCompare(b.category))
          .map((expense) => (
            <List.Item
              key={expense.id}
              title={expense.description}
              subtitle={`${expense.year} • ${expense.category}`}
              accessories={[
                { 
                  text: `${expense.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` 
                }
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Bearbeiten"
                    icon={Icon.Pencil}
                    target={
                      <EditExpenseForm
                        expense={expense}
                        onSave={async (updated) => {
                          const newExpenses = expenses.map((e) =>
                            e.id === updated.id ? updated : e
                          );
                          setExpenses(newExpenses);
                          await saveData(newExpenses, usageDays);
                          showToast(Toast.Style.Success, "Ausgabe aktualisiert");
                        }}
                      />
                    }
                  />
                  <Action
                    title="Löschen"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => deleteExpense(expense.id)}
                  />
                  <Action.Push
                    title="Neue Ausgabe"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={
                      <AddExpenseForm
                        onAdd={async (expense) => {
                          const newExpenses = [...expenses, expense];
                          setExpenses(newExpenses);
                          await saveData(newExpenses, usageDays);
                          showToast(Toast.Style.Success, "Ausgabe hinzugefügt");
                        }}
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
        <List.Item
          title="Neue Ausgabe hinzufügen"
          icon={{ source: Icon.Plus, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action.Push
                title="Ausgabe hinzufügen"
                icon={Icon.Plus}
                target={
                  <AddExpenseForm
                    onAdd={async (expense) => {
                      const newExpenses = [...expenses, expense];
                      setExpenses(newExpenses);
                      await saveData(newExpenses, usageDays);
                      showToast(Toast.Style.Success, "Ausgabe hinzugefügt");
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="📆 Nutzungstage pro Jahr">
        {usageDays
          .sort((a, b) => b.year - a.year)
          .map((usage) => (
            <List.Item
              key={usage.year}
              title={`${usage.year}`}
              accessories={[{ text: `${usage.days} Tage` }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Bearbeiten"
                    icon={Icon.Pencil}
                    target={
                      <EditUsageDaysForm
                        usageDays={usage}
                        onSave={async (updated) => {
                          const newUsageDays = usageDays.map((u) =>
                            u.year === updated.year ? updated : u
                          );
                          setUsageDays(newUsageDays);
                          await saveData(expenses, newUsageDays);
                          showToast(Toast.Style.Success, "Nutzungstage aktualisiert");
                        }}
                      />
                    }
                  />
                  <Action
                    title="Löschen"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => deleteUsageDays(usage.year)}
                  />
                  <Action.Push
                    title="Neue Nutzungstage"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={
                      <AddUsageDaysForm
                        onAdd={async (usage) => {
                          const existing = usageDays.find((u) => u.year === usage.year);
                          let newUsageDays: UsageDays[];
                          if (existing) {
                            newUsageDays = usageDays.map((u) =>
                              u.year === usage.year ? usage : u
                            );
                          } else {
                            newUsageDays = [...usageDays, usage];
                          }
                          setUsageDays(newUsageDays);
                          await saveData(expenses, newUsageDays);
                          showToast(Toast.Style.Success, "Nutzungstage gespeichert");
                        }}
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
        <List.Item
          title="Nutzungstage hinzufügen"
          icon={{ source: Icon.Plus, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action.Push
                title="Nutzungstage hinzufügen"
                icon={Icon.Plus}
                target={
                  <AddUsageDaysForm
                    onAdd={async (usage) => {
                      const existing = usageDays.find((u) => u.year === usage.year);
                      let newUsageDays: UsageDays[];
                      if (existing) {
                        newUsageDays = usageDays.map((u) =>
                          u.year === usage.year ? usage : u
                        );
                      } else {
                        newUsageDays = [...usageDays, usage];
                      }
                      setUsageDays(newUsageDays);
                      await saveData(expenses, newUsageDays);
                      showToast(Toast.Style.Success, "Nutzungstage gespeichert");
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="⚙️ Aktionen">
        <List.Item
          title="📊 CSV exportieren"
          subtitle="Für Numbers/Excel (Zwischenablage)"
          icon={{ source: Icon.Document, tintColor: Color.Purple }}
          actions={
            <ActionPanel>
              <Action title="CSV exportieren" icon={Icon.Document} onAction={exportCSV} />
            </ActionPanel>
          }
        />
        <List.Item
          title="📤 JSON exportieren"
          subtitle="Backup aller Daten"
          icon={{ source: Icon.Download, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action title="JSON exportieren" icon={Icon.Download} onAction={exportData} />
            </ActionPanel>
          }
        />
        <List.Item
          title="📥 JSON importieren"
          subtitle="Daten aus Zwischenablage laden"
          icon={{ source: Icon.Upload, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action title="Importieren" icon={Icon.Upload} onAction={importData} />
            </ActionPanel>
          }
        />
        <List.Item
          title="🗑️ Alle Daten löschen"
          subtitle="Zurücksetzen auf Anfangszustand"
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action 
                title="Alle Daten löschen" 
                icon={Icon.Trash} 
                style={Action.Style.Destructive}
                onAction={resetAllData} 
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function AddExpenseForm({ onAdd }: { onAdd: (expense: Expense) => void }) {
  const [yearError, setYearError] = useState<string | undefined>();
  const [amountError, setAmountError] = useState<string | undefined>();

  function handleSubmit(values: { year: string; category: string; description: string; amount: string }) {
    const yearNum = parseInt(values.year);
    const amountNum = parseFloat(values.amount.replace(',', '.'));

    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      setYearError("Bitte gültiges Jahr eingeben (1900-2100)");
      return;
    }

    if (isNaN(amountNum) || amountNum <= 0) {
      setAmountError("Bitte gültigen Betrag eingeben (größer als 0)");
      return;
    }

    const expense: Expense = {
      id: Date.now().toString(),
      year: yearNum,
      category: values.category,
      description: values.description,
      amount: amountNum,
    };
    onAdd(expense);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Hinzufügen" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="year"
        title="Jahr"
        placeholder="2025"
        defaultValue={new Date().getFullYear().toString()}
        error={yearError}
        onChange={() => setYearError(undefined)}
      />
      <Form.Dropdown id="category" title="Kategorie" defaultValue={CATEGORIES[0]}>
        {CATEGORIES.map((cat) => (
          <Form.Dropdown.Item key={cat} value={cat} title={cat} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="description"
        title="Bezeichnung"
        placeholder="z.B. Winterreifen"
      />
      <Form.TextField
        id="amount"
        title="Betrag (€)"
        placeholder="1250"
        info="Ganzzahl ohne Komma oder Punkt (Cent werden ignoriert)"
        error={amountError}
        onChange={() => setAmountError(undefined)}
      />
    </Form>
  );
}

function EditExpenseForm({
  expense,
  onSave,
}: {
  expense: Expense;
  onSave: (expense: Expense) => void;
}) {
  const [yearError, setYearError] = useState<string | undefined>();
  const [amountError, setAmountError] = useState<string | undefined>();

  function handleSubmit(values: { year: string; category: string; description: string; amount: string }) {
    const yearNum = parseInt(values.year);
    const amountNum = parseFloat(values.amount.replace(',', '.'));

    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      setYearError("Bitte gültiges Jahr eingeben (1900-2100)");
      return;
    }

    if (isNaN(amountNum) || amountNum <= 0) {
      setAmountError("Bitte gültigen Betrag eingeben (größer als 0)");
      return;
    }

    const updated: Expense = {
      ...expense,
      year: yearNum,
      category: values.category,
      description: values.description,
      amount: amountNum,
    };
    onSave(updated);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Speichern" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="year"
        title="Jahr"
        defaultValue={expense.year.toString()}
        error={yearError}
        onChange={() => setYearError(undefined)}
      />
      <Form.Dropdown id="category" title="Kategorie" defaultValue={expense.category}>
        {CATEGORIES.map((cat) => (
          <Form.Dropdown.Item key={cat} value={cat} title={cat} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="description"
        title="Bezeichnung"
        defaultValue={expense.description}
      />
      <Form.TextField
        id="amount"
        title="Betrag (€)"
        defaultValue={expense.amount.toString()}
        info="Ganzzahl ohne Komma oder Punkt (Cent werden ignoriert)"
        error={amountError}
        onChange={() => setAmountError(undefined)}
      />
    </Form>
  );
}

function AddUsageDaysForm({ onAdd }: { onAdd: (usage: UsageDays) => void }) {
  const [yearError, setYearError] = useState<string | undefined>();
  const [daysError, setDaysError] = useState<string | undefined>();

  function handleSubmit(values: { year: string; days: string }) {
    const yearNum = parseInt(values.year);
    const daysNum = parseInt(values.days);

    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      setYearError("Bitte gültiges Jahr eingeben (1900-2100)");
      return;
    }

    if (isNaN(daysNum) || daysNum < 0 || daysNum > 366) {
      setDaysError("Bitte gültige Anzahl Tage eingeben (0-366)");
      return;
    }

    const usage: UsageDays = {
      year: yearNum,
      days: daysNum,
    };
    onAdd(usage);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Hinzufügen" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="year"
        title="Jahr"
        placeholder="2025"
        defaultValue={new Date().getFullYear().toString()}
        error={yearError}
        onChange={() => setYearError(undefined)}
      />
      <Form.TextField
        id="days"
        title="Nutzungstage"
        placeholder="30"
        error={daysError}
        onChange={() => setDaysError(undefined)}
      />
    </Form>
  );
}

function EditUsageDaysForm({
  usageDays,
  onSave,
}: {
  usageDays: UsageDays;
  onSave: (usage: UsageDays) => void;
}) {
  const [yearError, setYearError] = useState<string | undefined>();
  const [daysError, setDaysError] = useState<string | undefined>();

  function handleSubmit(values: { year: string; days: string }) {
    const yearNum = parseInt(values.year);
    const daysNum = parseInt(values.days);

    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      setYearError("Bitte gültiges Jahr eingeben (1900-2100)");
      return;
    }

    if (isNaN(daysNum) || daysNum < 0 || daysNum > 366) {
      setDaysError("Bitte gültige Anzahl Tage eingeben (0-366)");
      return;
    }

    const updated: UsageDays = {
      year: yearNum,
      days: daysNum,
    };
    onSave(updated);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Speichern" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="year"
        title="Jahr"
        defaultValue={usageDays.year.toString()}
        error={yearError}
        onChange={() => setYearError(undefined)}
      />
      <Form.TextField
        id="days"
        title="Nutzungstage"
        defaultValue={usageDays.days.toString()}
        error={daysError}
        onChange={() => setDaysError(undefined)}
      />
    </Form>
  );
}