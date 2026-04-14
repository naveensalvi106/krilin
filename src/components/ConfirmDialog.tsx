import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { playWarning, playDelete, playClose } from '@/lib/sounds';
import { useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

const ConfirmDialog = ({ open, onConfirm, onCancel, title = 'Are you sure?', description = 'This action cannot be undone.' }: ConfirmDialogProps) => {
  useEffect(() => {
    if (open) playWarning();
  }, [open]);
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent style={{ background: 'linear-gradient(145deg, hsl(45, 90%, 25%), hsl(35, 80%, 18%))', border: '1px solid hsl(45, 80%, 35%)' }}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-foreground/70">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => playClose()} className="bg-muted border-border text-foreground hover:bg-muted/80">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => { onConfirm(); playDelete(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
