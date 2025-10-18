import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      expand={false}
      richColors={false}
      closeButton={true}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface group-[.toaster]:text-text group-[.toaster]:border-surface-2 group-[.toaster]:shadow-elev-2 group-[.toaster]:rounded-md group-[.toaster]:px-4 group-[.toaster]:py-3",
          title:
            "group-[.toast]:text-text group-[.toast]:font-medium group-[.toast]:text-body-sm",
          description:
            "group-[.toast]:text-text-muted group-[.toast]:text-body-sm",
          actionButton:
            "group-[.toast]:bg-brand group-[.toast]:text-brand-foreground group-[.toast]:hover:bg-brand/90 group-[.toast]:rounded-sm group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-body-sm group-[.toast]:font-medium group-[.toast]:focus:outline-none group-[.toast]:focus:ring-2 group-[.toast]:focus:ring-brand group-[.toast]:focus:ring-offset-2 group-[.toast]:transition-colors group-[.toast]:motion-reduce:transition-none",
          cancelButton:
            "group-[.toast]:bg-surface-2 group-[.toast]:text-text-muted group-[.toast]:hover:bg-surface-3 group-[.toast]:rounded-sm group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-body-sm group-[.toast]:focus:outline-none group-[.toast]:focus:ring-2 group-[.toast]:focus:ring-brand group-[.toast]:focus:ring-offset-2 group-[.toast]:transition-colors group-[.toast]:motion-reduce:transition-none",
          closeButton:
            "group-[.toast]:bg-surface-2 group-[.toast]:text-text-muted group-[.toast]:hover:bg-surface-3 group-[.toast]:focus:outline-none group-[.toast]:focus:ring-2 group-[.toast]:focus:ring-brand group-[.toast]:focus:ring-offset-2 group-[.toast]:transition-colors group-[.toast]:motion-reduce:transition-none",
          error:
            "group-[.toast]:border-destructive/20 group-[.toast]:bg-destructive/5",
          success:
            "group-[.toast]:border-success/20 group-[.toast]:bg-success/5",
          warning:
            "group-[.toast]:border-warning/20 group-[.toast]:bg-warning/5",
          info: "group-[.toast]:border-brand/20 group-[.toast]:bg-brand/5",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
