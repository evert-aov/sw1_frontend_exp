import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent, HeroIconName } from '../../../shared/components/icon/icon.component';

interface BrandFeature {
  icon: HeroIconName;
  titleKey: string;
  descKey: string;
}

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, RouterLink, TranslatePipe, IconComponent],
  templateUrl: './auth-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayoutComponent {
  readonly features: BrandFeature[] = [
    {
      icon: 'users',
      titleKey: 'auth.brand.feat1Title',
      descKey: 'auth.brand.feat1Desc',
    },
    {
      icon: 'shield-check',
      titleKey: 'auth.brand.feat2Title',
      descKey: 'auth.brand.feat2Desc',
    },
    {
      icon: 'chart-bar',
      titleKey: 'auth.brand.feat3Title',
      descKey: 'auth.brand.feat3Desc',
    },
  ];
}
