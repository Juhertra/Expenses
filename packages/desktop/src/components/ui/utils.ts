export function cn(...classes: Array<string | undefined | false | null>): string {
  return classes.filter(Boolean).join(' ');
}

export function getDir(): 'rtl' | 'ltr' {
  if (typeof document !== 'undefined' && document.documentElement.dir === 'rtl') return 'rtl';
  return 'ltr';
}
