/**
 * Animations Barrel — re-exports all animation sub-components.
 */

export { SpinnerComponent }       from './spinner/spinner';
export { RouteLoaderComponent }   from './route-loader/route-loader';
export { SkeletonLoaderComponent } from './skeleton-loader/skeleton-loader';
export { FadeInComponent }        from './fade-in/fade-in';
export { Carousel3DComponent }    from './carousel/carousel';

import { SpinnerComponent }        from './spinner/spinner';
import { RouteLoaderComponent }    from './route-loader/route-loader';
import { SkeletonLoaderComponent } from './skeleton-loader/skeleton-loader';
import { FadeInComponent }         from './fade-in/fade-in';
import { Carousel3DComponent }     from './carousel/carousel';

/** Convenience array — spread into your component's `imports: []` */
export const ANIMATION_COMPONENTS = [
  SpinnerComponent,
  RouteLoaderComponent,
  SkeletonLoaderComponent,
  FadeInComponent,
  Carousel3DComponent,
] as const;
