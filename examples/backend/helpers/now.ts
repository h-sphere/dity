import { ACCURACY, HELPER_DEPS } from '.'
import { makeInjector } from '../../../src'

@(makeInjector<HELPER_DEPS>()(['accuracy', 'num', 'num']))
export class NowFactory {
	constructor(
		private readonly acc: ACCURACY,
		second: number,
		third: number
	) {}

	now() {
		return this.acc + ' 123'
	}
}
