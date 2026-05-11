import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
  standalone: true
})
export class TruncatePipe implements PipeTransform {
  /**
   * Truncates long strings to a specified limit, appending a trail.
   * Usage in templates: {{ value | truncate:30:'...' }}
   */
  transform(value: string | null | undefined, limit: number = 30, trail: string = '...'): string {
    if (!value) return '';
    return value.length > limit ? value.substring(0, limit) + trail : value;
  }
}
