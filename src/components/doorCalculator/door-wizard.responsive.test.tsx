import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const wizardCss = readFileSync(
  path.join(process.cwd(), 'src/components/doorCalculator/door-wizard.css'),
  'utf8'
);

describe('DoorCalculatorWizard — компактный и мобильный шаг 2', () => {
  it('включает is-compact2: скрывает крошки и переносит панель под правую колонку', () => {
    expect(wizardCss).toContain('.door-wizard.is-compact2 .crumbs{display:none}');
    expect(wizardCss).toMatch(
      /\.door-wizard\.is-compact2 \.bar\{[\s\S]*position:fixed/
    );
    expect(wizardCss).toContain('.door-wizard.is-compact2 .bar__in{max-width:none;margin:0}');
  });

  it('на невысоком экране сужает «Состав проёма» до двух колонок', () => {
    expect(wizardCss).toMatch(
      /@media \(min-width:861px\) and \(max-height:860px\)[\s\S]*\.door-wizard \.sumbox ul\{[^}]*grid-template-columns:1fr 1fr/
    );
  });

  it('на мобильном шаге 2 скрывает eyebrow и крошки', () => {
    expect(wizardCss).toMatch(
      /@media \(max-width:860px\)[\s\S]*\.door-wizard \.crumbs\{display:none\}/
    );
    expect(wizardCss).toContain('.door-wizard .s2__top .eyebrow{display:none}');
    expect(wizardCss).toMatch(
      /@media \(max-width:860px\)[\s\S]*\.door-wizard \.wtop \.iconbtn\{width:28px;height:28px/
    );
  });
});