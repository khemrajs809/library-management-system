/**
 * Animations Barrel — re-exports all animation sub-components.
 */

export { SpinnerComponent }       from './spinner/spinner.component';
export { RouteLoaderComponent }   from './route-loader/route-loader.component';
export { SkeletonLoaderComponent } from './skeleton-loader/skeleton-loader.component';
export { FadeInComponent }        from './fade-in/fade-in.component';
export { Carousel3DComponent }    from './carousel/carousel.component';

import { SpinnerComponent }        from './spinner/spinner.component';
import { RouteLoaderComponent }    from './route-loader/route-loader.component';
import { SkeletonLoaderComponent } from './skeleton-loader/skeleton-loader.component';
import { FadeInComponent }         from './fade-in/fade-in.component';
import { Carousel3DComponent }     from './carousel/carousel.component';

/** Convenience array — spread into your component's `imports: []` */
export const ANIMATION_COMPONENTS = [
  SpinnerComponent,
  RouteLoaderComponent,
  SkeletonLoaderComponent,
  FadeInComponent,
  Carousel3DComponent,
] as const;
