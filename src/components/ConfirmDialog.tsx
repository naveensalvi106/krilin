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
      <AlertDialogContent style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(50px) saturate(2)', WebkitBackdropFilter: 'blur(50px) saturate(2)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 12px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
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
