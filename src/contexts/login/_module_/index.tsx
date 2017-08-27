import StatusView from './_module_/StatusView';
import reducers, { State } from './_module_/reducers';
import sagas from './_module_/sagas';

export type StatusState = { status: State };

export default {

  // public interface of the status context
  components: {
    StatusView
  },

  // technical exports
  sagas,
  reducers: { status: reducers }
};
