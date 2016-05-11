import Ember from 'ember';

export default Ember.Mixin.create({
  actions: {
    save: function() {
      var route = this;
      this.currentModel.save().then(function() {
        route.transitionTo('<%= dasherizedModuleNamePlural %>');
      }, function() {
        console.log('Failed to save the model');
      });
    }
  },

  willTransition() {
    this._super();
    const record = this.controller.get('record');
    record.rollbackAttributes();
  },
});
