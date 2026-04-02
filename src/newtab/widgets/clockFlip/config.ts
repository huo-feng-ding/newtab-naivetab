export const WIDGET_CODE = 'clockFlip'

export const WIDGET_CONFIG = {
  enabled: true,
  layout: {
    xOffsetKey: 'left',
    xOffsetValue: 50,
    xTranslateValue: -50,
    yOffsetKey: 'top',
    yOffsetValue: 50,
    yTranslateValue: -50,
  },
  // 尺寸
  width: 55,
  height: 95,
  // 字体
  fontFamily: 'LESLIEB',
  fontSize: 75,
  fontColor: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
  // 卡片
  cardColor: ['rgba(45, 45, 45, 1)', 'rgba(45, 45, 45, 1)'],
  cardDividerColor: ['rgba(30, 30, 30, 1)', 'rgba(30, 30, 30, 1)'],
  borderRadius: 10,
  cardGap: 5,
  // 阴影
  isShadowEnabled: true,
  shadowColor: ['rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.5)'],
  // 时间显示
  showSeconds: true,
  is24Hour: true,
  showColon: true,
  colonBlinkEnabled: false,
}

export type TWidgetConfig = typeof WIDGET_CONFIG
