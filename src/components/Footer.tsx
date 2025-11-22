import { Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="py-6 mt-12 border-t border-border/40">
      <div className="container mx-auto px-4">
        <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          Dibuat oleh Hoed dengan <Heart className="w-4 h-4 text-red-500 fill-red-500" /> Cinta
        </p>
      </div>
    </footer>
  );
};
