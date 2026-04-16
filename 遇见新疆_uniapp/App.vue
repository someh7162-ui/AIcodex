<script>
import { clearAiMessages } from './config/ai'

export default {
  onLaunch() {
    console.log('Meet Xinjiang app launched');
  },
  onHide() {
    clearAiMessages()
  },
  onUnload() {
    clearAiMessages()
  },
};
</script>

<style lang="scss">
@import './common/common.scss';
</style>
