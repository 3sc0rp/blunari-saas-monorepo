import { 
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu"
import { Moon, Sun, Monitor, Check } from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <>
      <DropdownMenuItem 
        onClick={() => setTheme("light")}
        className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4" />
          <span>Light</span>
        </div>
        {theme === "light" && <Check className="h-4 w-4 text-blue-500" />}
      </DropdownMenuItem>
      <DropdownMenuItem 
        onClick={() => setTheme("dark")}
        className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4" />
          <span>Dark</span>
        </div>
        {theme === "dark" && <Check className="h-4 w-4 text-blue-500" />}
      </DropdownMenuItem>
      <DropdownMenuItem 
        onClick={() => setTheme("system")}
        className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          <span>System</span>
        </div>
        {theme === "system" && <Check className="h-4 w-4 text-blue-500" />}
      </DropdownMenuItem>
    </>
  )
}