import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white dark:group-[.toaster]:bg-zinc-900 group-[.toaster]:text-zinc-900 dark:group-[.toaster]:text-zinc-100 group-[.toaster]:border-zinc-200 dark:group-[.toaster]:border-zinc-800 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-zinc-600 dark:group-[.toast]:text-zinc-400",
          actionButton:
            "group-[.toast]:bg-blue-600 group-[.toast]:text-white hover:group-[.toast]:bg-blue-700",
          cancelButton:
            "group-[.toast]:bg-zinc-100 dark:group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-700 dark:group-[.toast]:text-zinc-300",
          closeButton:
            "group-[.toaster]:text-zinc-600 dark:group-[.toaster]:text-zinc-400 hover:group-[.toaster]:text-zinc-900 dark:hover:group-[.toaster]:text-zinc-100",
          icon:
            "group-[.toast]:text-zinc-600 dark:group-[.toast]:text-zinc-400",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
